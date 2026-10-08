import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {defaults,validateOptions} from '../../runtime/config.mjs';
import {Store} from '../../runtime/store.mjs';
import {createServers} from '../../runtime/server.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fossflow-e2e-'));
const artifacts=path.join(root,'test-results');await fs.mkdir(artifacts,{recursive:true});
const config={options:validateOptions({...defaults,autosave_seconds:1,backup_interval_hours:0,direct_access:true,direct_password:'e2e-strong-password'}),dataDir:dir,staticDir:path.resolve(process.env.FOSSFLOW_TEST_STATIC_DIR || path.join(root,'.work/upstream/packages/fossflow-app/build')),shareDir:path.join(dir,'share'),sslDir:path.join(dir,'ssl'),ingressHost:'127.0.0.1',ingressPort:0,directHost:'127.0.0.1',directPort:0,ingressPeers:['127.0.0.1'],version:'1.1.0'};
let store,servers,browser,proxy,debugPage;
const prefix='/api/hassio_ingress/E2E_rotating_token';const errors=[];const failures=[];const tests=[];
const sample={title:'Domowa sieć',name:'Domowa sieć',items:[{id:'router',name:'FunBox · LAN',icon:'ha-custom'},{id:'ha',name:'Home Assistant',icon:'ha-custom'},{id:'nas',name:'NAS / backup',icon:'ha-custom'}],icons:[{id:'ha-custom',name:'Home server',collection:'imported',url:'data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="100"><path fill="#268db5" d="M45 5L85 28V73L45 95L5 73V28Z"/><path fill="#126084" d="M45 50L85 28V73L45 95Z"/><path fill="#a3e0fc" d="M45 5L85 28L45 50L5 28Z"/></svg>').toString('base64'),isIsometric:true}],colors:[{id:'blue',value:'#126b91'}],views:[{id:'home',name:'Home',items:[{id:'router',tile:{x:0,y:0}},{id:'ha',tile:{x:3,y:0}},{id:'nas',tile:{x:0,y:3}}],connectors:[{id:'c1',color:'blue',anchors:[{id:'a1',ref:{item:'router'}},{id:'a2',ref:{item:'ha'}}],showArrow:true}]}]};
async function poll(fn,timeout=10000){const until=Date.now()+timeout;while(Date.now()<until){if(await fn())return;await delay(100);}throw new Error('Polling timeout');}
try{
  store=new Store(config);await store.init();servers=await createServers(config,store);await servers.start();
  let port=servers.ingress.address().port;
  const directPort=servers.direct.address().port;
  proxy=http.createServer((req,res)=>{
    if(req.url === '/home-assistant-test') {res.setHeader('content-type','text/html');return res.end(`<html><body style="margin:0"><iframe title="FossFLOW Ingress" src="${prefix}/" style="border:0;width:100%;height:100vh"></iframe></body></html>`);}
    if(!req.url.startsWith(prefix+'/')){res.statusCode=404;return res.end('Unexpected root-relative URL: '+req.url);}
    const headers={...req.headers,'x-ingress-path':prefix};
    const upstream=http.request({hostname:'127.0.0.1',port,path:req.url.slice(prefix.length),method:req.method,headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
    upstream.on('error',e=>{res.statusCode=502;res.end(e.message);});req.pipe(upstream);
  });await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${proxy.address().port}`;
  const args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader'];
  browser=await chromium.launch({headless:true,args,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}: {})});
  const context=await browser.newContext({viewport:{width:1440,height:960},acceptDownloads:true});const page=await context.newPage();debugPage=page;
  page.on('dialog',dialog=>dialog.accept());
  page.on('console',m=>{if(m.type() === 'error')console.error('Browser console:',m.text());});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status() >= 400)failures.push(`${r.status()} ${r.url()}`);});
  await page.goto(base+'/home-assistant-test');const frame=page.frameLocator('iframe');
  await frame.getByRole('button',{name:'Zapisz',exact:true}).waitFor();
  await delay(150);assert.doesNotMatch(await frame.getByRole('status').textContent(),/Niezapisane/);
  assert.equal(await frame.locator('canvas,svg').count()>0,true);
  assert.equal(await frame.locator('body').evaluate(()=>document.baseURI),base+prefix+'/');
  tests.push('Ingress iframe: editor renders, dynamic base path, all assets and API stay under prefix');
  await frame.getByTestId('ha-import-file').setInputFiles({name:'network.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))});
  await frame.getByRole('textbox',{name:'Nazwa diagramu'}).waitFor();
  await poll(async()=>await frame.getByRole('textbox',{name:'Nazwa diagramu'}).inputValue() === 'Domowa sieć');
  await frame.getByRole('button',{name:'Zapisz',exact:true}).click();
  await frame.getByRole('status').filter({hasText:'Zapisano na serwerze'}).waitFor();
  let list=await store.list();assert.equal(list.length,1);const id=list[0].id;
  let persisted=await store.read(id);assert.equal(persisted.items.length,3);assert.equal(persisted.icons.length,1);assert.equal(persisted.views[0].connectors.length,1);
  tests.push('Import + first server save: nodes, connector and custom SVG icon survive');
  await frame.getByRole('textbox',{name:'Nazwa diagramu'}).fill('LAN po zmianie');
  await poll(async()=> (await store.read(id)).name === 'LAN po zmianie');
  assert.ok((await store.revisions(id)).length >= 1);
  tests.push('Autosave writes renamed diagram after debounce and creates history');
  await frame.getByRole('button',{name:'Historia',exact:true}).click();await frame.getByRole('button',{name:'Wczytaj wersję',exact:true}).first().click();
  await poll(async()=>await frame.getByRole('textbox',{name:'Nazwa diagramu'}).inputValue() === 'Domowa sieć');
  await frame.getByRole('button',{name:'Zapisz',exact:true}).click();await poll(async()=> (await store.read(id)).name === 'Domowa sieć');
  tests.push('History restore loads previous version and saves with current ETag');
  const downloadPromise=page.waitForEvent('download');await frame.getByRole('button',{name:'Eksport JSON',exact:true}).click();const download=await downloadPromise;
  await download.saveAs(path.join(artifacts,'diagram-export.json'));const exported=JSON.parse(await fs.readFile(path.join(artifacts,'diagram-export.json'),'utf8'));assert.equal(exported.items.length,3);assert.ok(exported.icons.some(i=>i.id === 'ha-custom'));
  tests.push('JSON export is a valid downloadable diagram including custom icons');
  await frame.getByRole('button',{name:'Main menu',exact:true}).click();
  await frame.getByText('Export as image',{exact:true}).click();
  const pngReady=frame.getByRole('button',{name:'Download as PNG',exact:true});await pngReady.waitFor({timeout:20000});
  const pngPromise=page.waitForEvent('download');await pngReady.click();const png=await pngPromise;
  await png.saveAs(path.join(artifacts,'diagram-export.png'));const pngBytes=await fs.readFile(path.join(artifacts,'diagram-export.png'));
  assert.equal(pngBytes.subarray(1,4).toString(),'PNG');assert.ok(pngBytes.length > 1000);
  await frame.getByRole('button',{name:'Cancel',exact:true}).click();tests.push('Upstream PNG export produces a real downloadable image');
  await frame.getByRole('button',{name:'Kopie',exact:true}).click();await frame.getByRole('button',{name:'Utwórz kopię teraz',exact:true}).click();
  await poll(async()=> (await fs.readdir(store.backupDir)).length === 1);await frame.getByRole('dialog').getByRole('button',{name:'Zamknij',exact:true}).click();
  await page.screenshot({path:path.join(artifacts,'desktop-ingress.png'),fullPage:true});
  tests.push('Manual backup creates persistent file');
  // Restart the runtime and open the saved model through a fresh browser context.
  await servers.close();store.close();store=new Store(config);await store.init();servers=await createServers(config,store);await servers.start();port=servers.ingress.address().port;
  await page.reload();await frame.getByRole('button',{name:'Diagramy',exact:true}).click();await frame.getByRole('button',{name:'Otwórz',exact:true}).first().click();
  await poll(async()=>await frame.getByRole('textbox',{name:'Nazwa diagramu'}).inputValue() === 'Domowa sieć');
  assert.equal((await store.read(id)).items.length,3);tests.push('Restart preserves server diagram and UI can load it');
  // Second browser updates the ETag; first browser must preserve its own changes.
  const old=await store.read(id);const {etag}=await import('../../runtime/store.mjs');await store.save(id,{...old,name:'Changed elsewhere',title:'Changed elsewhere'},{expected:etag(old)});
  await frame.getByRole('textbox',{name:'Nazwa diagramu'}).fill('My conflicting copy');await page.keyboard.press('Control+s');
  await frame.getByRole('alert').filter({hasText:'innym urządzeniu'}).waitFor();assert.equal((await store.read(id)).name,'Changed elsewhere');
  await frame.getByRole('button',{name:'Zapisz kopię',exact:true}).click();await poll(async()=> (await store.list()).length === 2);tests.push('Concurrent edit: conflict warning and Save a copy preserve both versions');
  await frame.getByRole('button',{name:'Diagramy',exact:true}).click();
  const copyRow=frame.locator('.ha-row').filter({hasText:'My conflicting copy'});await copyRow.getByRole('button',{name:'Usuń',exact:true}).click();
  await poll(async()=> (await store.list()).length === 1);await frame.getByRole('dialog').getByRole('button',{name:'Zamknij',exact:true}).click();
  await frame.getByRole('button',{name:'Kosz',exact:true}).click();await frame.getByRole('button',{name:'Odzyskaj',exact:true}).first().click();
  await poll(async()=> (await store.list()).length === 2 && (await store.trash()).length === 0);await frame.getByRole('dialog').getByRole('button',{name:'Zamknij',exact:true}).click();
  tests.push('Trash UI: delete saved diagram and recover it as a new ID');
  await frame.getByRole('button',{name:'Kopie',exact:true}).click();
  const storedDownload=page.waitForEvent('download');await frame.getByRole('button',{name:'Pobierz',exact:true}).first().click();const stored=await storedDownload;await stored.saveAs(path.join(artifacts,'stored-backup.json'));
  const storedBundle=JSON.parse(await fs.readFile(path.join(artifacts,'stored-backup.json'),'utf8'));assert.equal(storedBundle.format,'fossflow-ha-backup');
  tests.push('Saved-backup UI downloads a valid archive');
  const beforeRestore=(await store.list()).length;await frame.getByRole('button',{name:'Odzyskaj',exact:true}).first().click();await poll(async()=> (await store.list()).length > beforeRestore);
  tests.push('Saved-backup UI restores new diagrams without overwriting existing files');
  const beforeDelete=(await store.backups()).length;await frame.getByRole('button',{name:'Usuń trwale',exact:true}).first().click();await poll(async()=> (await store.backups()).length === beforeDelete-1);
  await frame.getByRole('dialog').getByRole('button',{name:'Zamknij',exact:true}).click();tests.push('Saved-backup UI removes selected local archive');
  await frame.getByRole('button',{name:'Diagnostyka',exact:true}).click();await frame.locator('.ha-diagnostics').waitFor();
  assert.match(await frame.locator('.ha-diagnostics').textContent(),/diskFreeBytes/);await page.keyboard.press('Escape');await frame.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(await frame.locator('body').evaluate(()=>document.activeElement?.textContent),'Diagnostyka');tests.push('Diagnostics UI displays storage status; Escape restores keyboard focus');
  await frame.getByRole('textbox',{name:'Nazwa diagramu'}).fill('Keyboard save');const beforeCopy=(await store.list()).length;
  await page.keyboard.press('Control+s');await poll(async()=> (await store.list()).some(d=>d.name === 'Keyboard save'));
  await poll(()=>frame.getByRole('button',{name:'Zapisz',exact:true}).isEnabled());
  await page.keyboard.press('Control+Shift+s');await poll(async()=> (await store.list()).length === beforeCopy+2);tests.push('Keyboard shortcuts create a diagram and save a separate copy');
  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});const mp=await mobile.newPage();
  mp.on('dialog',dialog=>dialog.accept());
  await mp.goto(base+prefix+'/');await mp.getByRole('button',{name:'Diagramy',exact:true}).click();await mp.getByRole('button',{name:'Otwórz',exact:true}).first().click();
  await mp.getByRole('dialog').waitFor({state:'hidden'});
  const dismiss=mp.getByRole('button',{name:'Dismiss connector hint',exact:true});if(await dismiss.count())await dismiss.click();
  const zoomIn=mp.getByRole('button',{name:'Zoom in',exact:true}),zoomOut=mp.getByRole('button',{name:'Zoom out',exact:true});
  for(let i=0;i<30 && await zoomIn.isEnabled();i++)await zoomIn.click();
  assert.equal(await zoomIn.isDisabled(),true);assert.equal(await zoomOut.isEnabled(),true);
  for(let i=0;i<30 && await zoomOut.isEnabled();i++)await zoomOut.click();
  assert.equal(await zoomOut.isDisabled(),true);assert.equal(await zoomIn.isEnabled(),true);
  await mp.getByRole('button',{name:'Fit to screen',exact:true}).click();
  const zoomBox=await mp.getByTestId('ha-zoom-controls').boundingBox(),titleBox=await mp.getByTestId('ha-view-title').boundingBox();
  assert.ok(titleBox.y+titleBox.height <= zoomBox.y);assert.ok(titleBox.x >= 0 && titleBox.x+titleBox.width <= 390);
  tests.push('Zoom limits remain reversible; mobile view title and zoom controls do not overlap');
  assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth),true);await mp.screenshot({path:path.join(artifacts,'mobile-ingress.png'),fullPage:true});tests.push('390 × 844 mobile viewport: toolbar scrolls and page has no horizontal overflow');
  const lan=await context.newPage();const newDirect=servers.direct.address().port;await lan.goto(`http://127.0.0.1:${newDirect}/`);
  await lan.locator('#username').fill('fossflow');await lan.locator('#password').fill('e2e-strong-password');await lan.getByRole('button',{name:'Zaloguj / Sign in'}).click();await lan.getByRole('button',{name:'Diagramy',exact:true}).waitFor();tests.push('LAN login opens real editor using authenticated cookie');
  await servers.close();store.close();config.options={...config.options,startup_diagram:'latest',browser_drafts:false,editor_grid:false,external_icons:false};
  store=new Store(config);await store.init();servers=await createServers(config,store);await servers.start();port=servers.ingress.address().port;
  const latest=await context.newPage();await latest.goto(base+prefix+'/');await poll(async()=>await latest.getByRole('textbox',{name:'Nazwa diagramu'}).inputValue() === 'Keyboard save');
  await latest.getByRole('textbox',{name:'Nazwa diagramu'}).fill('No browser draft');await delay(700);assert.equal(await latest.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('fossflow-ha-draft:'))),false);
  assert.equal(await latest.evaluate(()=>window.__FOSSFLOW__.editorGrid),false);tests.push('Startup latest loads the most recent diagram; browser drafts and editor grid can be disabled');
  await latest.close();
  await servers.close();store.close();config.options={...config.options,read_only:true,theme:'dark',language:'en'};
  store=new Store(config);await store.init();servers=await createServers(config,store);await servers.start();port=servers.ingress.address().port;
  const dark=await context.newPage();await dark.goto(base+prefix+'/');await dark.getByRole('button',{name:'Diagrams',exact:true}).click();await dark.getByRole('button',{name:'Open',exact:true}).first().click();await dark.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(await dark.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);assert.equal(await dark.getByRole('textbox',{name:'Diagram name'}).isDisabled(),true);
  assert.equal(await dark.locator('html').getAttribute('data-theme'),'dark');await dark.screenshot({path:path.join(artifacts,'dark-readonly.png'),fullPage:true});
  tests.push('English + dark + read-only: real editor loads, name and save controls are disabled');
  // Ignore only the intentionally provoked optimistic-lock conflict.
  assert.deepEqual(failures.filter(f=>!f.startsWith('412 ')),[]);assert.deepEqual(errors,[]);
  tests.push('No browser page exceptions, missing assets or unexpected failed requests');
  // Exercise the shipped entrypoint process and SIGTERM without Docker.
  const child=spawn(process.execPath,[path.join(root,'runtime/main.mjs')],{env:{...process.env,FOSSFLOW_DATA_DIR:dir,FOSSFLOW_STATIC_DIR:config.staticDir,FOSSFLOW_INGRESS_PORT:'18099',FOSSFLOW_INGRESS_HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
  let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
  try{await poll(async()=>{try{return (await fetch('http://127.0.0.1:18099/health')).ok;}catch{return false;}});const exited=new Promise(resolve=>child.once('exit',resolve));child.kill('SIGTERM');assert.equal(await exited,0);assert.match(log,/Stopping FossFLOW/);tests.push('Shipped main process starts and exits cleanly on SIGTERM');}
  finally{if(child.exitCode === null)child.kill('SIGKILL');}
  await fs.writeFile(path.join(artifacts,'e2e-results.json'),JSON.stringify({browser:await browser.version(),tests,errors,failures},null,2));
  console.log(`PASS ${tests.length} browser scenarios\n`+tests.map((t,i)=>`${i+1}. ${t}`).join('\n'));
}catch(e){
  console.error('Browser errors:',JSON.stringify(errors));console.error('Failed responses:',JSON.stringify(failures));
  await debugPage?.screenshot({path:path.join(artifacts,'failure.png'),fullPage:true}).catch(()=>{});
  throw e;
}finally{
  await browser?.close();await servers?.close();store?.close();if(proxy)await new Promise(resolve=>proxy.close(resolve));await fs.rm(dir,{recursive:true,force:true});
}
