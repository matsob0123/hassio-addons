import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(process.argv[2] || '/src');
const buttonPath=path.join(root,'packages/fossflow-lib/src/components/IconButton/IconButton.tsx');
let button=await fs.readFile(buttonPath,'utf8');
if(!button.includes('aria-label={name}')) {
  if(!button.includes('<Button\n        variant="text"')) throw new Error('Upstream IconButton changed; review accessibility patch');
  button=button.replace('<Button\n        variant="text"','<Button\n        aria-label={name}\n        disabled={disabled}\n        variant="text"');
  await fs.writeFile(buttonPath,button);
}
const webpackPath=path.join(root,'packages/fossflow-lib/webpack.config.js');
let webpack=await fs.readFile(webpackPath,'utf8');
if(webpack.includes("mode: 'development'")) {
  webpack=webpack.replace("mode: 'development'","mode: 'production',\n  devtool: false");
  await fs.writeFile(webpackPath,webpack);
} else if(!webpack.includes('devtool: false')) throw new Error('Upstream webpack configuration changed; review production patch');
for(const name of ['App.tsx','App.css','index.tsx']) await fs.copyFile(path.join(source,name),path.join(root,'packages/fossflow-app/src',name));
await fs.copyFile(path.join(source,'index.html'),path.join(root,'packages/fossflow-app/public/index.html'));
for(const name of ['logo192.png','logo512.png','favicon.ico']) await fs.copyFile(path.join(source,'assets',name),path.join(root,'packages/fossflow-app/public',name));
const labelPath=path.join(root,'packages/fossflow-lib/src/components/Label/Label.tsx');
let label=await fs.readFile(labelPath,'utf8');
if(label.includes("bgcolor: 'common.white'")) await fs.writeFile(labelPath,label.replace("bgcolor: 'common.white'","bgcolor: 'background.paper'"));
const defaultsPath=path.join(root,'packages/fossflow-lib/src/config.ts');
let defaults=await fs.readFile(defaultsPath,'utf8');
if(defaults.includes('export const DEFAULT_LABEL_HEIGHT = 20;')) await fs.writeFile(defaultsPath,defaults.replace('export const DEFAULT_LABEL_HEIGHT = 20;','export const DEFAULT_LABEL_HEIGHT = 80;'));
const themePath=path.join(root,'packages/fossflow-lib/src/styles/theme.ts');
let theme=await fs.readFile(themePath,'utf8');
if(!theme.includes('/* HA_THEME */')) {
  if(!theme.includes('  palette: {') || !theme.includes("backgroundColor: 'white'")) throw new Error('Upstream theme changed; review patch');
  theme=theme.replace('export const themeConfig:', `/* HA_THEME */
const preference = typeof window !== 'undefined' ? (window as any).__FOSSFLOW__?.theme : 'light';
const dark = preference === 'dark' || (preference === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
export const themeConfig:`);
  theme=theme.replace('  palette: {',"  palette: {\n    mode: dark ? 'dark' : 'light',");
  theme=theme.replace("backgroundColor: 'white'","backgroundColor: 'var(--ha-panel, white)'");
  await fs.writeFile(themePath,theme);
}
