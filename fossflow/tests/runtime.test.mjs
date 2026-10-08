import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {validateOptions, defaults, loadConfig} from '../runtime/config.mjs';
import {Store, etag} from '../runtime/store.mjs';
import {createServers, ingressBase} from '../runtime/server.mjs';

const diagram = name => ({title:name,name,items:[],views:[],icons:[],colors:[]});
async function fixture(t, options={}, peers=['127.0.0.1']) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fossflow-test-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const staticDir=path.join(dir,'public');await fs.mkdir(staticDir);
  await fs.writeFile(path.join(staticDir,'index.html'),'<html><head><title>FossFLOW</title></head><body><div id="root"></div><script src="./index.js"></script></body></html>');
  await fs.writeFile(path.join(staticDir,'index.js'),'console.log("FossFLOW")');
  const config={options:validateOptions({backup_interval_hours:0,...options}),dataDir:dir,staticDir,shareDir:path.join(dir,'share'),sslDir:path.join(dir,'ssl'),ingressHost:'127.0.0.1',ingressPort:0,directHost:'127.0.0.1',directPort:0,ingressPeers:peers,version:'test'};
  const store=new Store(config);await store.init();
  const servers=await createServers(config,store);await servers.start();
  const base=`http://127.0.0.1:${servers.ingress.address().port}`;
  const direct=servers.direct && `http://127.0.0.1:${servers.direct.address().port}`;
  const req=(p,method='GET',data,headers={})=>fetch(base+p,{method,headers:{...(data !== undefined ? {'content-type':'application/json'}:{}),...headers},...(data !== undefined ? {body:JSON.stringify(data)}:{})});
  t.after(async()=>{store.close();await servers.close();await fs.rm(dir,{recursive:true,force:true});});
  return {dir,config,store,servers,base,direct,req};
}

test('configuration rejects invalid values and fails closed for LAN credentials',()=>{
  assert.equal(validateOptions().direct_access,false);
  assert.throws(()=>validateOptions({direct_access:true}),/12 characters/);
  assert.throws(()=>validateOptions({max_diagrams:-1}),/max_diagrams/);
  assert.throws(()=>validateOptions({storage_enabled:'true'}),/boolean/);
  assert.throws(()=>validateOptions({certfile:'../key.pem'}),/certfile/);
  assert.throws(()=>validateOptions({language:'xx'}),/language/);
  assert.throws(()=>validateOptions({unknown:true}),/Unknown/);
  assert.throws(()=>validateOptions({default_diagram_name:' '}),/name/);
});
test('options file is parsed, missing file uses safe defaults, malformed JSON fails',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fossflow-options-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  assert.equal((await loadConfig({FOSSFLOW_DATA_DIR:dir})).options.direct_access,false);
  await fs.writeFile(path.join(dir,'options.json'),'broken');await assert.rejects(loadConfig({FOSSFLOW_DATA_DIR:dir}),SyntaxError);
});
test('Ingress validates dynamic prefix and does not leak configuration secrets',async t=>{
  const {req}=await fixture(t,{direct_password:'secret-secret-secret'});
  const r=await req('/','GET',undefined,{'X-Ingress-Path':'/api/hassio_ingress/abc_TOKEN'});assert.equal(r.status,200);
  const html=await r.text();assert.match(html,/<base href="\/api\/hassio_ingress\/abc_TOKEN\/">/);assert.match(html,/window.__FOSSFLOW__/);assert.doesNotMatch(html,/secret-secret-secret|direct_password/);
  assert.equal((await req('/','GET',undefined,{'X-Ingress-Path':'//evil.example'})).status,400);
  assert.throws(()=>ingressBase('/foo"bar'),/Invalid/);
  assert.throws(()=>ingressBase('/../escape'),/Invalid/);
  const config=await (await req('/api/config')).json();assert.equal(config.readOnly,false);assert.equal(config.language,'pl');assert.ok(!('direct_password' in config));
});
test('Ingress uses actual peer, rejects spoofed forwarding headers; loopback health works',async t=>{
  const {req}=await fixture(t,{},['172.30.32.2']);
  assert.equal((await req('/')).status,403);
  assert.equal((await req('/api/diagrams','GET',undefined,{'X-Forwarded-For':'172.30.32.2','X-Ingress-Path':'/api/hassio_ingress/x'})).status,403);
  assert.equal((await req('/health')).status,200);
});
test('create/list/read/update/delete use persistent files and ETag preconditions',async t=>{
  const {req,dir,store}=await fixture(t);
  const first=await req('/api/diagrams','POST',{...diagram('LAN'),id:'network'});assert.equal(first.status,201);const v1=first.headers.get('etag');
  assert.equal((await req('/api/diagrams','POST',{...diagram('LAN'),id:'network'})).status,409);
  const get=await req('/api/diagrams/network');assert.equal(get.headers.get('etag'),v1);assert.equal((await get.json()).name,'LAN');
  assert.equal((await req('/api/diagrams/network','PUT',diagram('New'))).status,428);
  const update=await req('/api/diagrams/network','PUT',diagram('Nowa sieć'),{'If-Match':v1});assert.equal(update.status,200);const v2=update.headers.get('etag');assert.notEqual(v1,v2);
  assert.equal((await req('/api/diagrams/network','PUT',diagram('Stale'),{'If-Match':v1})).status,412);
  const list=await (await req('/api/diagrams')).json();assert.equal(list[0].name,'Nowa sieć');assert.equal(list[0].etag,v2);
  const onDisk=JSON.parse(await fs.readFile(path.join(dir,'diagrams/network.json'),'utf8'));assert.equal(onDisk.name,'Nowa sieć');
  const reopened=new Store(store.config);await reopened.init();assert.equal((await reopened.read('network')).name,'Nowa sieć');reopened.close();
  const revisions=await (await req('/api/diagrams/network/revisions')).json();assert.equal(revisions.length,1);
  assert.equal((await (await req(`/api/diagrams/network/revisions/${revisions[0].id}`)).json()).name,'LAN');
  assert.equal((await req('/api/diagrams/network','DELETE',undefined,{'If-Match':v1})).status,412);
  assert.equal((await req('/api/diagrams/network','DELETE',undefined,{'If-Match':v2})).status,200);assert.equal((await req('/api/diagrams/network')).status,404);
});
test('concurrent writes cannot silently overwrite another client',async t=>{
  const {store}=await fixture(t);const first=await store.save('parallel',diagram('Initial'),{create:true});
  const result=await Promise.allSettled([store.save('parallel',diagram('A'),{expected:etag(first)}),store.save('parallel',diagram('B'),{expected:etag(first)})]);
  assert.equal(result.filter(r=>r.status === 'fulfilled').length,1);assert.equal(result.find(r=>r.status === 'rejected').reason.status,412);
  const files=await fs.readdir(store.dir);assert.deepEqual(files,['parallel.json']);
});
test('paths, invalid models, missing IDs and unknown APIs return errors',async t=>{
  const {req}=await fixture(t);
  assert.equal((await req('/api/diagrams','POST',{...diagram('Bad'),id:'../../options'})).status,400);
  assert.equal((await req('/api/diagrams/..%2Foptions')).status,400);
  assert.equal((await req('/api/diagrams','POST',{title:'Broken'})).status,400);
  assert.equal((await req('/api/diagrams/missing')).status,404);
  assert.equal((await req('/api/unknown')).status,404);
  assert.equal((await req('/service-worker.js')).status,404);
  assert.equal((await req('/not-an-asset.js')).status,404);
  assert.equal((await req('/index.js','POST',{})).status,405);
});
test('JSON content type, invalid JSON and request size limits are enforced',async t=>{
  const {base,req}=await fixture(t,{max_diagram_size_mb:1});
  assert.equal((await fetch(base+'/api/diagrams',{method:'POST',body:'{}'})).status,415);
  assert.equal((await fetch(base+'/api/diagrams',{method:'POST',headers:{'content-type':'application/json'},body:'not json'})).status,400);
  assert.equal((await req('/api/diagrams','POST',{...diagram('Huge'),description:'x'.repeat(1048576)})).status,413);
});
test('cross-site writes are blocked and CORS is not open',async t=>{
  const {req,base}=await fixture(t);
  const r=await req('/api/diagrams','POST',diagram('X'),{Origin:'https://evil.example'});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
  assert.equal((await req('/api/diagrams','POST',diagram('X'),{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await req('/api/diagrams','POST',diagram('Own'),{Origin:base})).status,201);
});
test('read-only blocks all writes and retains readable data',async t=>{
  const {store,req}=await fixture(t,{read_only:true});
  await fs.writeFile(store.file('existing'),JSON.stringify(diagram('Existing')));
  assert.equal((await req('/api/diagrams')).status,200);
  assert.equal((await req('/api/diagrams/existing')).status,200);
  for(const [p,m,d] of [['/api/diagrams','POST',diagram('X')],['/api/diagrams/existing','PUT',diagram('X')],['/api/diagrams/existing','DELETE'],['/api/backups','POST',{}],['/api/backups/restore','POST',{}]]) assert.equal((await req(p,m,d)).status,403);
  assert.equal((await req('/api/backups/export')).status,200);
});
test('disabled storage advertises fallback and does not accept writes',async t=>{
  const {req}=await fixture(t,{storage_enabled:false});
  assert.equal((await (await req('/api/storage/status')).json()).enabled,false);
  assert.equal((await req('/api/diagrams')).status,503);assert.equal((await req('/api/diagrams','POST',diagram('X'))).status,503);
});
test('diagram and revision limits are respected',async t=>{
  const {store}=await fixture(t,{max_diagrams:1,revisions_keep:2});
  let d=await store.save('one',diagram('one'),{create:true});await assert.rejects(store.save('two',diagram('two'),{create:true}),{status:409});
  for(let i=0;i<4;i++) d=await store.save('one',diagram(`revision ${i}`),{expected:etag(d)});
  assert.equal((await store.revisions('one')).length,2);
});
test('backup exports, retention and non-destructive restore preserve diagrams and custom icons',async t=>{
  const {store,req,config}=await fixture(t,{backup_keep:2,backup_to_share:true});
  const data={...diagram('Custom'),icons:[{id:'custom',name:'Custom',url:'data:image/svg+xml;base64,PHN2Zy8+',collection:'imported'}]};
  await store.save('custom',data,{create:true});
  for(let i=0;i<4;i++)assert.equal((await store.backup()).shared,true);
  assert.equal((await fs.readdir(store.backupDir)).length,2);assert.equal((await fs.readdir(config.shareDir)).length,2);
  const bundle=await (await req('/api/backups/export')).json();assert.equal(bundle.diagrams[0].icons[0].id,'custom');
  assert.equal((await req('/api/backups/restore','POST',bundle)).status,201);const all=await store.list();assert.equal(all.length,2);assert.ok(all.find(d=>d.id === 'custom'));
  const bad={...bundle,diagrams:[data,{title:'Invalid'}]};assert.equal((await req('/api/backups/restore','POST',bad)).status,400);assert.equal((await store.list()).length,2);
});
test('corrupt and symlinked diagrams do not break the list or expose external files',async t=>{
  const {store,dir}=await fixture(t);await store.save('good',diagram('Good'),{create:true});
  await fs.writeFile(store.file('broken'),'not json');await fs.writeFile(path.join(dir,'secret.json'),JSON.stringify(diagram('Secret')));await fs.symlink(path.join(dir,'secret.json'),store.file('link'));
  assert.deepEqual((await store.list()).map(d=>d.id),['good']);await assert.rejects(store.read('link'),{status:400});
});
test('authenticated LAN uses HttpOnly cookies, logout and rate limiting; spoofed Ingress cannot bypass',async t=>{
  const {direct}=await fixture(t,{direct_access:true,direct_password:'a-strong-password'});
  assert.equal((await fetch(direct+'/api/diagrams',{headers:{'X-Ingress-Path':'/api/hassio_ingress/spoof'}})).status,401);
  assert.match(await (await fetch(direct+'/')).text(),/auth\/login/);
  const login=await fetch(direct+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'fossflow',password:'a-strong-password'})});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);
  assert.equal((await fetch(direct+'/api/diagrams',{headers:{cookie}})).status,200);
  assert.equal((await fetch(direct+'/auth/logout',{method:'POST',headers:{cookie}})).status,200);
  assert.equal((await fetch(direct+'/api/diagrams',{headers:{cookie}})).status,401);
  for(let i=0;i<5;i++)assert.equal((await fetch(direct+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'fossflow',password:'wrong'})})).status,401);
  assert.equal((await fetch(direct+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,429);
});
test('HTTPS requires real configured certificate files; missing certificate fails startup',async t=>{
  await assert.rejects(fixture(t,{direct_access:true,direct_password:'a-strong-password',direct_ssl:true}),/ENOENT/);
});
test('actual HTTPS LAN listener authenticates and issues Secure session cookie',async t=>{
  const {config,store}=await fixture(t);await fs.mkdir(config.sslDir);
  // Fresh key for this test only: never publish a private key in source control.
  await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost',
    '-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-keyout',path.join(config.sslDir,'privkey.pem'),'-out',path.join(config.sslDir,'fullchain.pem')]);
  const tls=await createServers({...config,options:validateOptions({...config.options,direct_access:true,direct_password:'secure-tls-password',direct_ssl:true})},store);
  await tls.start();t.after(()=>tls.close());
  const payload=JSON.stringify({username:'fossflow',password:'secure-tls-password'});
  const response=await new Promise((resolve,reject)=>{
    const req=https.request({hostname:'127.0.0.1',port:tls.direct.address().port,path:'/auth/login',method:'POST',rejectUnauthorized:false,headers:{'content-type':'application/json','content-length':Buffer.byteLength(payload)}},res=>{res.resume();res.on('end',()=>resolve(res));});req.on('error',reject);req.end(payload);
  });assert.equal(response.statusCode,200);assert.match(response.headers['set-cookie'][0],/; Secure/);
});
test('static assets support HEAD and safe caching; Ingress manifest is scoped',async t=>{
  const {req}=await fixture(t);
  const r=await req('/index.js','HEAD');assert.equal(r.status,200);assert.equal(await r.text(),'');assert.equal(r.headers.get('x-content-type-options'),'nosniff');
  const manifest=await (await req('/manifest.json','GET',undefined,{'X-Ingress-Path':'/api/hassio_ingress/token'})).json();
  assert.equal(manifest.scope,'/api/hassio_ingress/token/');assert.equal(manifest.icons[0].src,'/api/hassio_ingress/token/logo192.png');
});
test('startup releases first listener if second port is occupied',async t=>{
  const {config,store}=await fixture(t);
  const blocker=http.createServer();await new Promise(resolve=>blocker.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>blocker.close(resolve)));
  const s=await createServers({...config,options:validateOptions({...config.options,direct_access:true,direct_password:'long-enough-password'}),directPort:blocker.address().port},store);
  await assert.rejects(s.start(),{code:'EADDRINUSE'});assert.equal(s.ingress.listening,false);
});

test('advanced options validate types, boundaries, enums and inherited property names',()=>{
  assert.equal(Object.keys(defaults).length,31);
  assert.throws(()=>validateOptions({trash_keep_days:366}),/trash_keep_days/);
  assert.throws(()=>validateOptions({trash_max:0}),/trash_max/);
  assert.throws(()=>validateOptions({backup_max_size_mb:101}),/backup_max_size_mb/);
  assert.throws(()=>validateOptions({startup_diagram:'unknown'}),/startup_diagram/);
  assert.throws(()=>validateOptions({diagram_sort:'unknown'}),/diagram_sort/);
  assert.throws(()=>validateOptions({browser_drafts:1}),/boolean/);
  assert.throws(()=>validateOptions({toString:'bad'}),/Unknown/);
});
test('trash recovers deleted diagrams under new IDs; repeated recovery cannot duplicate',async t=>{
  const {store,req}=await fixture(t);
  const old=await store.save('recover',diagram('Recover me'),{create:true});
  assert.equal((await req('/api/diagrams/recover','DELETE',undefined,{'If-Match':etag(old)})).status,200);
  assert.equal((await store.revisions('recover')).length,0);
  const entries=await (await req('/api/trash')).json();assert.equal(entries.length,1);assert.equal(entries[0].name,'Recover me');
  const responses=await Promise.all([req(`/api/trash/${entries[0].id}/restore`,'POST',{}),req(`/api/trash/${entries[0].id}/restore`,'POST',{})]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,404]);
  const recovered=await responses.find(r=>r.status===201).json();assert.notEqual(recovered.id,'recover');assert.equal((await store.read(recovered.id)).name,'Recover me');assert.equal((await store.trash()).length,0);
});
test('trash retention limits count, expires old entries and supports permanent deletion',async t=>{
  const {store,req}=await fixture(t,{trash_max:2,trash_keep_days:1});
  for(let i=0;i<3;i++){const d=await store.save(`item${i}`,diagram(`Item ${i}`),{create:true});await store.remove(`item${i}`,etag(d));}
  assert.equal((await store.trash()).length,2);
  const oldId=`${Date.now()-2*86400000}-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`;
  await fs.writeFile(path.join(store.trashDir,`${oldId}.json`),JSON.stringify({deletedAt:new Date().toISOString(),diagram:diagram('Expired')}));
  assert.equal((await req(`/api/trash/${oldId}/restore`,'POST',{})).status,410);
  await store.pruneTrash();assert.equal((await fs.readdir(store.trashDir)).length,2);
  const entry=(await store.trash())[0];assert.equal((await req(`/api/trash/${entry.id}`,'DELETE')).status,200);assert.equal((await req(`/api/trash/${entry.id}`,'DELETE')).status,404);
});
test('disabled trash deletes permanently; capacity prevents recovery without losing archive',async t=>{
  const {store}=await fixture(t,{trash_keep_days:0});const d=await store.save('no-trash',diagram('No trash'),{create:true});await store.remove('no-trash',etag(d));assert.equal((await fs.readdir(store.trashDir)).length,0);
  const limited=await fixture(t,{max_diagrams:1});const old=await limited.store.save('one',diagram('One'),{create:true});await limited.store.remove('one',etag(old));const entry=(await limited.store.trash())[0];await limited.store.save('two',diagram('Two'),{create:true});
  assert.equal((await limited.req(`/api/trash/${entry.id}/restore`,'POST',{})).status,409);assert.equal((await limited.store.trash()).length,1);
});
test('stored backups can be listed, downloaded, restored as new IDs and removed',async t=>{
  const {store,req}=await fixture(t);await store.save('original',diagram('Original'),{create:true});const b=await store.backup();
  const list=await (await req('/api/backups')).json();assert.equal(list[0].name,b.name);assert.ok(list[0].size > 0);
  const download=await req(`/api/backups/${b.name}`);assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/attachment/);assert.equal((await download.json()).diagrams[0].id,'original');
  assert.equal((await req(`/api/backups/${b.name}/restore`,'POST',{})).status,201);assert.equal((await store.list()).length,2);
  assert.equal((await req(`/api/backups/${b.name}`,'DELETE')).status,200);assert.equal((await req(`/api/backups/${b.name}`)).status,404);
});
test('archive IDs, symlinks and cross-site archive writes are rejected',async t=>{
  const {store,req,dir}=await fixture(t);
  for(const p of ['/api/backups/..%2Foptions.json','/api/trash/..%2Foptions/restore'])assert.equal((await req(p,p.endsWith('restore')?'POST':'GET',p.endsWith('restore')?{}:undefined)).status,400);
  const name='fossflow-123-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.json';await fs.writeFile(path.join(dir,'secret.json'),'{}');await fs.symlink(path.join(dir,'secret.json'),path.join(store.backupDir,name));
  assert.equal((await store.backups()).length,0);assert.equal((await req(`/api/backups/${name}`)).status,400);assert.equal((await req(`/api/backups/${name}`,'DELETE')).status,400);
  assert.equal((await req('/api/trash/1-aaaaaaaa/restore','POST',{}, {Origin:'https://evil.example'})).status,403);
});
test('read-only and disabled storage protect every new mutation API',async t=>{
  for(const [options,status] of [[{read_only:true},403],[{storage_enabled:false},503]]){
    const {req}=await fixture(t,options);
    for(const [p,m] of [['/api/trash/123-aaaa/restore','POST'],['/api/trash/123-aaaa','DELETE'],['/api/backups/fossflow-123-aaaa.json/restore','POST'],['/api/backups/fossflow-123-aaaa.json','DELETE']])assert.equal((await req(p,m,m==='POST'?{}:undefined)).status,status);
    if(options.storage_enabled===false){assert.equal((await req('/api/trash')).status,503);assert.equal((await req('/api/backups')).status,503);}
    assert.equal((await req('/api/diagnostics')).status,200);
  }
});
test('backup limits apply to exports, direct uploads and stored file downloads',async t=>{
  const {store,req}=await fixture(t,{max_diagram_size_mb:2,backup_max_size_mb:1});await store.save('large',{...diagram('Large'),description:'x'.repeat(1048576)},{create:true});
  assert.equal((await req('/api/backups/export')).status,413);assert.equal((await req('/api/backups','POST',{})).status,413);
  assert.equal((await req('/api/backups/restore','POST',{format:'fossflow-ha-backup',version:1,diagrams:[{...diagram('Large'),description:'x'.repeat(1048576)}]})).status,413);
  const name='fossflow-123-aaaaaaaa.json';await fs.writeFile(path.join(store.backupDir,name),'x'.repeat(1048577));assert.equal((await req(`/api/backups/${name}`)).status,413);
});
test('startup backs up existing data, supports disabling and survives failed share copy',async t=>{
  const {store,config}=await fixture(t,{backup_to_share:true});await store.save('restart',diagram('Restart'),{create:true});
  await fs.writeFile(config.shareDir,'not a directory');
  const logs=[];const restarted=new Store(config,(...v)=>logs.push(v));await restarted.init();restarted.close();assert.equal((await restarted.backups()).length,1);assert.equal((await restarted.read('restart')).name,'Restart');assert.ok(logs.some(v=>v[0]==='warning'));
  const off=new Store({...config,options:{...config.options,backup_on_start:false}});await off.init();off.close();assert.equal((await off.backups()).length,1);
});
test('sorting supports names and creation dates, malformed metadata cannot break list',async t=>{
  const {store}=await fixture(t,{diagram_sort:'name'});await store.save('z',diagram('Zebra'),{create:true});await store.save('a',diagram('Alpha'),{create:true});assert.deepEqual((await store.list()).map(d=>d.id),['a','z']);
  const data=await store.read('a');data.lastModified={bad:true};data.created=[];await fs.writeFile(store.file('a'),JSON.stringify(data));await fs.writeFile(store.file('malformed'),JSON.stringify({name:{bad:true}}));assert.equal((await store.list()).length,2);
  store.o={...store.o,diagram_sort:'created'};assert.equal((await store.list()).length,2);
});
test('diagnostics expose counts and limits but no credentials or filesystem paths',async t=>{
  const {store,req}=await fixture(t,{direct_password:'never-include-this'});await store.save('metrics',diagram('Metrics'),{create:true});await store.backup();
  const response=await req('/api/diagnostics');const text=await response.text();assert.doesNotMatch(text,/never-include-this|direct_password|\/tmp\//);const d=JSON.parse(text);assert.equal(d.diagrams,1);assert.equal(d.backups,1);assert.ok(d.diskFreeBytes>0);assert.equal(d.limits.diagrams,500);
  const c=await (await req('/api/config')).json();assert.equal(c.editorGrid,true);assert.equal(c.browserDrafts,true);assert.equal(c.startupDiagram,'new');assert.equal(c.backupMaxSizeMb,100);
});
test('external image switch restricts CSP; null payloads fail cleanly',async t=>{
  const {req}=await fixture(t,{external_icons:false});const r=await req('/');assert.match(r.headers.get('content-security-policy'),/img-src 'self' data: blob:;/);assert.doesNotMatch(r.headers.get('content-security-policy'),/https:/);
  assert.equal((await req('/api/diagrams','POST',null)).status,400);assert.equal((await req('/api/diagrams','POST',{...diagram('Bad'),id:['array']})).status,400);
});
