import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(process.argv[2] || '/src');
const tsconfigPath=path.join(root,'packages/fossflow-app/tsconfig.json');
const tsconfig=JSON.parse(await fs.readFile(tsconfigPath,'utf8'));
tsconfig.compilerOptions.target='es2020';
await fs.writeFile(tsconfigPath,JSON.stringify(tsconfig,null,2)+'\n');
// The original unused service assigns untyped JSON to boolean | null.
// Keep its source type-correct even though the HA wrapper uses its own API client.
const servicePath=path.join(root,'packages/fossflow-app/src/services/storageService.ts');
let service=await fs.readFile(servicePath,'utf8');
if(service.includes('this.available = data.enabled;')) {
  await fs.writeFile(servicePath,service.replace('this.available = data.enabled;','this.available = data.enabled === true;'));
} else if(!service.includes('this.available = data.enabled === true;')) throw new Error('Upstream storage service changed; review type patch');
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
const zoomPath=path.join(root,'packages/fossflow-lib/src/components/ZoomControls/ZoomControls.tsx');
let zoom=await fs.readFile(zoomPath,'utf8');
if(!zoom.includes('data-testid="ha-zoom-controls"')) {
  if(!zoom.includes('disabled={zoom >= MAX_ZOOM}') || !zoom.includes('disabled={zoom <= MIN_ZOOM}')) throw new Error('Upstream zoom changed; review limits');
  zoom=zoom.replace('disabled={zoom >= MAX_ZOOM}','disabled={zoom <= MIN_ZOOM}').replace(/(name="Zoom in"[\s\S]*?)disabled=\{zoom <= MIN_ZOOM\}/,'$1disabled={zoom >= MAX_ZOOM}');
  zoom=zoom.replace('<Stack direction="row" spacing={1} alignItems="center">','<Stack data-testid="ha-zoom-controls" direction="row" spacing={1} alignItems="center">');
  await fs.writeFile(zoomPath,zoom);
}
const overlayPath=path.join(root,'packages/fossflow-lib/src/components/UiOverlay/UiOverlay.tsx');
let overlay=await fs.readFile(overlayPath,'utf8');
if(!overlay.includes('data-testid="ha-view-title"')) {
  const titleAnchor="{availableTools.includes('VIEW_TITLE') && (\n          <Box";
  if(!overlay.includes(titleAnchor) || !overlay.includes('width: rendererSize.width - 500')) throw new Error('Upstream overlay changed; review responsive controls');
  overlay=overlay.replace(titleAnchor,titleAnchor+' data-testid="ha-view-title"');
  const start=overlay.indexOf('data-testid="ha-view-title"');
  const title=overlay.slice(start).replace('top: rendererSize.height - appPadding.y * 2','top: rendererSize.height - appPadding.y * (rendererSize.width < 700 ? 4 : 2)').replace('width: rendererSize.width - 500','width: Math.max(0, rendererSize.width - (rendererSize.width < 700 ? appPadding.x * 2 : 500))').replace("display: 'inline-flex',","display: 'inline-flex',\n                maxWidth: '100%',").replace('<Typography fontWeight={600}','<Typography noWrap fontWeight={600}');
  overlay=overlay.slice(0,start)+title;
  await fs.writeFile(overlayPath,overlay);
}
const hintPath=path.join(root,'packages/fossflow-lib/src/components/ConnectorHintTooltip/ConnectorHintTooltip.tsx');
let hint=await fs.readFile(hintPath,'utf8');
if(!hint.includes('aria-label="Dismiss connector hint"')) {
  hint=hint.replace('<IconButton\n          size="small"','<IconButton\n          aria-label="Dismiss connector hint"\n          size="small"');
  await fs.writeFile(hintPath,hint);
}
