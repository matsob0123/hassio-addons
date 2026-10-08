import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { HttpError, etag } from './store.mjs';

const zip = promisify(gzip);
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.jpg':'image/jpeg','.map':'application/json' };
const peer = req => req.socket.remoteAddress?.replace(/^::ffff:/,'');
const escapeJson = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
export function ingressBase(header) {
  if(!header) return '/';
  if(typeof header !== 'string' || header.length > 512 || !/^\/[A-Za-z0-9_/-]+\/?$/.test(header) || header.includes('//')) throw new HttpError(400,'Invalid Ingress path');
  return `${header.replace(/\/$/,'')}/`;
}
export async function readJson(req, max) {
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw new HttpError(415,'Use application/json');
  if(Number(req.headers['content-length']) > max) throw new HttpError(413,'Request too large');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if(size > max) throw new HttpError(413,'Request too large');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400,'Invalid JSON'); }
}

const loginHtml = `<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FossFLOW · Logowanie</title><style>body{font:16px system-ui;background:#101923;color:#f3f7fc;display:grid;place-items:center;min-height:95vh;margin:0}form{width:min(340px,80vw);padding:32px;border:1px solid #36495d;border-radius:20px;background:#182735}h1{margin-top:0}label{display:block;margin:16px 0 6px}input,button{box-sizing:border-box;width:100%;font:inherit;padding:12px;border-radius:8px;border:1px solid #75889b}button{margin-top:24px;background:#85d1ff;color:#0c2639;cursor:pointer}p{color:#b9cbdc;line-height:1.5}#error{color:#ffb4ab}</style><form id="login"><h1>FossFLOW</h1><p>Bezpośredni dostęp / Direct access</p><label for="username">Użytkownik / Username</label><input id="username" name="username" autocomplete="username" required><label for="password">Hasło / Password</label><input id="password" name="password" type="password" autocomplete="current-password" required><button>Zaloguj / Sign in</button><p id="error" role="alert"></p></form><script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();try{const r=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.querySelector('#username').value,password:document.querySelector('#password').value})});if(r.ok)location.href='/';else document.querySelector('#error').textContent=r.status===429?'Zbyt wiele prób. Spróbuj później. / Too many attempts.':'Błędne dane logowania. / Invalid credentials.';}catch{document.querySelector('#error').textContent='Brak połączenia / Connection failed';}};</script></html>`;

export async function createServers(config, store, log = ()=>{}) {
  const o = config.options; const sessions = new Map(); const attempts = new Map();
  const salt = randomBytes(16); const passwordHash = scryptSync(o.direct_password,salt,32);
  const html = await fs.readFile(path.join(config.staticDir,'index.html'),'utf8');
  const encodeToken = token => createHash('sha256').update(token).digest('hex');
  const sessionKey = req => {
    const token = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('fossflow_session='))?.slice(17);
    return token && encodeToken(token);
  };
  const sweep = setInterval(()=>{
    const now = Date.now();
    for(const [key, expiry] of sessions) if(expiry < now) sessions.delete(key);
    for(const [key, a] of attempts) if(a.until < now) attempts.delete(key);
  },60000); sweep.unref();

  async function send(req,res,status,body,type='application/json; charset=utf-8',headers={}) {
    let bytes = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    res.statusCode = status;
    res.setHeader('Content-Type',type); res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:${o.external_icons ? ' https: http:' : ''}; font-src 'self' data:; connect-src 'self'; worker-src 'none'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`);
    for(const [key,value] of Object.entries(headers)) res.setHeader(key,value);
    if(o.compression_enabled && bytes.length > 1024 && /(?:text|json|javascript|svg)/.test(type)) {
      res.setHeader('Vary','Accept-Encoding');
      if(/\bgzip\b(?!\s*;\s*q=0(?:\D|$))/.test(req.headers['accept-encoding'] || '')) {
        bytes = await zip(bytes); res.setHeader('Content-Encoding','gzip');
      }
    }
    res.setHeader('Content-Length',bytes.length);
    res.end(req.method === 'HEAD' ? undefined : bytes);
  }
  function checkWriteOrigin(req) {
    if(req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403,'Cross-site request rejected');
    if(req.headers.origin) {
      let origin;
      try { origin = new URL(req.headers.origin); } catch { throw new HttpError(403,'Invalid origin'); }
      if(origin.host !== req.headers.host || !['http:','https:'].includes(origin.protocol)) throw new HttpError(403,'Cross-origin request rejected');
    }
  }
  function authenticated(req) {
    const key = sessionKey(req); return key && (sessions.get(key) || 0) > Date.now();
  }
  async function handler(req,res,ingress) {
    const started = Date.now();
    if(o.access_log) res.on('finish',()=>log('info',`${ingress ? 'Ingress' : 'LAN'} ${req.method} ${res.statusCode} ${Date.now()-started}ms`));
    try {
      const pathname = new URL(req.url,'http://localhost').pathname;
      if(pathname === '/health' && req.method === 'GET') {
        if(ingress && !config.ingressPeers.includes(peer(req)) && !['127.0.0.1','::1'].includes(peer(req))) throw new HttpError(403,'Forbidden');
        await fs.access(path.join(config.staticDir,'index.html'));
        if(o.storage_enabled) await fs.access(store.dir);
        return send(req,res,200,{status:'ok',version:config.version});
      }
      if(ingress && !config.ingressPeers.includes(peer(req))) throw new HttpError(403,'Only the Supervisor can use Ingress');
      const base = ingress ? ingressBase(req.headers['x-ingress-path']) : '/';
      if(!['GET','HEAD'].includes(req.method)) checkWriteOrigin(req);
      if(!ingress) {
        if(pathname === '/auth/login' && req.method === 'POST') {
          const ip = peer(req); const now = Date.now();
          if(attempts.size >= 10000 && !attempts.has(ip)) throw new HttpError(429,'Too many attempts');
          let entry = attempts.get(ip);
          if(!entry || entry.until < now) { entry = {count:0,until:now+900000}; attempts.set(ip,entry); }
          if(entry.count >= 5) throw new HttpError(429,'Too many attempts');
          entry.count++;
          const data = await readJson(req,4096);
          const supplied = typeof data?.password === 'string' && data.password.length <= 1024 ? data.password : '';
          const match = timingSafeEqual(passwordHash,scryptSync(supplied,salt,32));
          if(data?.username !== o.direct_username || !match) throw new HttpError(401,'Invalid credentials');
          if(sessions.size >= 1000) throw new HttpError(429,'Too many sessions');
          attempts.delete(ip);
          const token = randomBytes(32).toString('hex'); const seconds = o.direct_session_hours*3600;
          sessions.set(encodeToken(token),now+seconds*1000);
          return send(req,res,200,{success:true},undefined,{'Set-Cookie':`fossflow_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${seconds}${o.direct_ssl ? '; Secure' : ''}`});
        }
        if(!authenticated(req)) {
          if(pathname.startsWith('/api/')) throw new HttpError(401,'Authentication required');
          return send(req,res,200,loginHtml,'text/html; charset=utf-8');
        }
        if(pathname === '/auth/logout' && req.method === 'POST') {
          sessions.delete(sessionKey(req));
          return send(req,res,200,{success:true},undefined,{'Set-Cookie':'fossflow_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});
        }
      }
      if(pathname.startsWith('/api/')) return await api(req,res,pathname,base,ingress);
      if(!['GET','HEAD'].includes(req.method)) throw new HttpError(405,'Method not allowed');
      if(pathname === '/manifest.json') return send(req,res,200,{
        name:'FossFLOW',short_name:'FossFLOW',start_url:base,scope:base,display:'standalone',background_color:'#f5f8fb',theme_color:'#126b91',
        icons:[{src:`${base}logo192.png`,sizes:'192x192',type:'image/png'},{src:`${base}logo512.png`,sizes:'512x512',type:'image/png'}]
      });
      // No service worker is registered: it must never cache HA's session URLs or API.
      if(pathname === '/service-worker.js') throw new HttpError(404,'Service workers are disabled');
      if(pathname === '/' || pathname === '/index.html') {
        const client = {...publicConfig(base,ingress),version:config.version};
        const injected = html.replace('<head>',`<head><base href="${base}"><script>window.__FOSSFLOW__=${escapeJson(client)};</script>`);
        return send(req,res,200,injected,'text/html; charset=utf-8');
      }
      let decoded; try { decoded = decodeURIComponent(pathname); } catch { throw new HttpError(400,'Invalid URL'); }
      if(decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(p=>p === '..' || p.startsWith('.'))) throw new HttpError(400,'Invalid path');
      const file = path.resolve(config.staticDir,`.${decoded}`);
      if(!file.startsWith(`${config.staticDir}${path.sep}`)) throw new HttpError(403,'Forbidden');
      let stat; try { stat = await fs.lstat(file); } catch(e) { if(e.code === 'ENOENT') throw new HttpError(404,'Not found'); throw e; }
      if(!stat.isFile() || stat.isSymbolicLink()) throw new HttpError(404,'Not found');
      const type = mime[path.extname(file)] || 'application/octet-stream';
      return send(req,res,200,await fs.readFile(file),type,{'Cache-Control':/\.[a-f0-9]{8,}\./.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600'});
    } catch(e) {
      if(e.status === undefined) log('error',`Request failed: ${e.message}`);
      if(!res.headersSent) await send(req,res,e.status || 500,{error:e.status ? e.message : 'Internal server error'});
      else res.destroy();
    }
  }
  function publicConfig(base,ingress) {
    return {basePath:base,ingress,language:o.language,theme:o.theme,autosaveSeconds:o.autosave_seconds,defaultDiagramName:o.default_diagram_name,storageEnabled:o.storage_enabled,readOnly:o.read_only,maxDiagramSizeMb:o.max_diagram_size_mb,backupMaxSizeMb:o.backup_max_size_mb,trashDays:o.trash_keep_days,startupDiagram:o.startup_diagram,browserDrafts:o.browser_drafts,editorGrid:o.editor_grid,externalIcons:o.external_icons};
  }
  async function api(req,res,p,base,ingress) {
    const method = req.method;
    if(p === '/api/config' && method === 'GET') return send(req,res,200,publicConfig(base,ingress));
    if(p === '/api/diagnostics' && method === 'GET') return send(req,res,200,await store.diagnostics());
    if(p === '/api/storage/status' && method === 'GET') return send(req,res,200,{enabled:o.storage_enabled,readOnly:o.read_only,version:config.version});
    if(p === '/api/diagrams') {
      if(method === 'GET') return send(req,res,200,await store.list());
      if(method === 'POST') {
        store.requireStorage(true);
        const d = await readJson(req,o.max_diagram_size_mb*1048576);
        const saved = await store.save(d?.id || randomUUID(),d,{create:true});
        return send(req,res,201,{success:true,id:saved.id},undefined,{ETag:etag(saved)});
      }
      throw new HttpError(405,'Method not allowed');
    }
    const diagram = /^\/api\/diagrams\/([^/]+)(?:\/revisions(?:\/([^/]+))?)?$/.exec(p);
    if(diagram) {
      let id, revision;
      try { id = decodeURIComponent(diagram[1]); revision = diagram[2] && decodeURIComponent(diagram[2]); }
      catch { throw new HttpError(400,'Invalid ID'); }
      if(p.includes('/revisions')) {
        if(method !== 'GET') throw new HttpError(405,'Method not allowed');
        return send(req,res,200,revision ? await store.readRevision(id,revision) : await store.revisions(id));
      }
      if(method === 'GET') { const d = await store.read(id); return send(req,res,200,d,undefined,{ETag:etag(d)}); }
      if(method === 'PUT') {
        store.requireStorage(true);
        const d = await readJson(req,o.max_diagram_size_mb*1048576);
        const saved = await store.save(id,d,{expected:req.headers['if-match']});
        return send(req,res,200,{success:true,id},undefined,{ETag:etag(saved)});
      }
      if(method === 'DELETE') { await store.remove(id,req.headers['if-match']); return send(req,res,200,{success:true}); }
      throw new HttpError(405,'Method not allowed');
    }
    if(p === '/api/backups/export' && method === 'GET') return send(req,res,200,await store.exportBundle(),undefined,{'Content-Disposition':'attachment; filename="fossflow-backup.json"'});
    if(p === '/api/backups' && method === 'GET') return send(req,res,200,await store.backups());
    if(p === '/api/backups' && method === 'POST') { await readJson(req,4096); return send(req,res,201,await store.backup()); }
    if(p === '/api/backups/restore' && method === 'POST') {
      store.requireStorage(true);
      return send(req,res,201,await store.restore(await readJson(req,o.backup_max_size_mb*1048576)));
    }
    const backup=/^\/api\/backups\/([^/]+)(\/restore)?$/.exec(p);
    if(backup) {
      const name=backup[1];
      if(backup[2] && method === 'POST') { store.requireStorage(true); await readJson(req,4096); return send(req,res,201,await store.restore(await store.readBackup(name))); }
      if(!backup[2] && method === 'GET') return send(req,res,200,await store.readBackup(name),undefined,{'Content-Disposition':`attachment; filename="${name}"`});
      if(!backup[2] && method === 'DELETE') { await store.removeArchive(name,true); return send(req,res,200,{success:true}); }
      throw new HttpError(405,'Method not allowed');
    }
    if(p === '/api/trash' && method === 'GET') return send(req,res,200,await store.trash());
    const trash=/^\/api\/trash\/([^/]+)(\/restore)?$/.exec(p);
    if(trash) {
      if(trash[2] && method === 'POST') { store.requireStorage(true); await readJson(req,4096); return send(req,res,201,await store.restoreTrash(trash[1])); }
      if(!trash[2] && method === 'DELETE') { await store.removeArchive(trash[1]); return send(req,res,200,{success:true}); }
      throw new HttpError(405,'Method not allowed');
    }
    throw new HttpError(404,'API endpoint not found');
  }
  function tune(server) { server.requestTimeout = 120000; server.headersTimeout = 15000; server.keepAliveTimeout = 5000; return server; }
  const ingress = tune(http.createServer((req,res)=>handler(req,res,true)));
  let direct;
  if(o.direct_access) {
    if(o.direct_ssl) {
      try {
        const [cert,key] = await Promise.all([fs.readFile(path.join(config.sslDir,o.certfile)),fs.readFile(path.join(config.sslDir,o.keyfile))]);
        direct = tune(https.createServer({cert,key,minVersion:'TLSv1.2'},(req,res)=>handler(req,res,false)));
      } catch(e) { clearInterval(sweep); throw e; }
    } else direct = tune(http.createServer((req,res)=>handler(req,res,false)));
  }
  async function listen(server,port,host) {
    await new Promise((resolve,reject)=> { server.once('error',reject); server.listen(port,host,resolve); });
  }
  async function closeServer(server) {
    if(!server?.listening) return;
    await new Promise(resolve=>{server.close(resolve); server.closeIdleConnections(); setTimeout(()=>server.closeAllConnections(),5000).unref();});
  }
  return {
    ingress,direct,
    async start() {
      try { await listen(ingress,config.ingressPort,config.ingressHost); if(direct) await listen(direct,config.directPort,config.directHost); }
      catch(e) { await Promise.all([closeServer(ingress),closeServer(direct)]); clearInterval(sweep); throw e; }
    },
    async close() { clearInterval(sweep); await Promise.all([closeServer(ingress),closeServer(direct)]); }
  };
}
