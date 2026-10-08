import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const etag = data => `"${createHash('sha256').update(JSON.stringify(data)).digest('hex')}"`;
export function validId(id) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new HttpError(400, 'Invalid diagram ID');
  return id;
}
export function validateDiagram(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400,'Diagram must be an object');
  const name = data.name ?? data.title;
  if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new HttpError(400,'Diagram name must have 1..100 characters');
  for (const key of ['items','views','icons','colors']) if (!Array.isArray(data[key])) throw new HttpError(400,`Missing diagram array: ${key}`);
  return { ...data, name:name.trim(), title:name.trim() };
}
async function readFileSafe(file) {
  const stats = await fs.lstat(file);
  if (!stats.isFile() || stats.isSymbolicLink()) throw new HttpError(400,'Not a regular file');
  return fs.readFile(file,'utf8');
}
async function atomicWrite(file, content) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    const handle = await fs.open(temp, 'wx', 0o600);
    try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temp,file);
    const dir = await fs.open(path.dirname(file),'r');
    try { await dir.sync(); } finally { await dir.close(); }
  } finally { await fs.unlink(temp).catch(()=>{}); }
}

export class Store {
  constructor(config, log = ()=>{}) {
    this.config = config; this.o = config.options; this.log = log;
    this.dir = path.join(config.dataDir,'diagrams');
    this.revisionsDir = path.join(config.dataDir,'revisions');
    this.backupDir = path.join(config.dataDir,'backups');
    this.trashDir = path.join(config.dataDir,'trash');
    this.queue = Promise.resolve(); this.timer = null;
  }
  async init() {
    for (const dir of [this.config.dataDir, this.dir,this.revisionsDir,this.backupDir,this.trashDir]) await fs.mkdir(dir,{recursive:true, mode:0o700});
    if (this.o.storage_enabled && !this.o.read_only) {
      await this.pruneTrash();
      await this.prune(this.backupDir);
      await this.pruneRevisions();
      this.trashTimer=setInterval(()=>this.serial(async()=>{await this.pruneTrash();await this.pruneRevisions();await this.prune(this.backupDir);}).catch(e=>this.log('error',`Retention failed: ${e.message}`)),3600000);
      this.trashTimer.unref();
      if (this.o.backup_on_start && (await this.list()).length) {
        // A failed backup must not make saved diagrams unavailable.
        await this.backup({scheduled:true}).catch(e=>this.log('error',`Startup backup failed: ${e.message}`));
      }
    }
    // Stale temporary writes are never visible as diagrams. Preserve them for investigation.
    if (this.o.storage_enabled && !this.o.read_only && this.o.backup_interval_hours > 0) {
      await this.scheduleBackups();
    }
  }
  close() { this.closed=true; clearTimeout(this.timer); clearInterval(this.trashTimer); }
  async scheduleBackups() {
    const latest=(await this.backups())[0];
    const interval=this.o.backup_interval_hours*3600000;
    this.nextBackupAt=Date.now()+Math.max(1000,latest ? Date.parse(latest.date)+interval-Date.now() : interval);
    const arm = () => {
      if(this.closed) return;
      this.timer=setTimeout(async()=>{
        try { await this.backup({scheduled:true});this.nextBackupAt=Date.now()+interval; }
        catch(e) { this.log('error',`Scheduled backup failed: ${e.message}`);this.nextBackupAt=Date.now()+60000; }
        arm();
      },Math.max(1000,this.nextBackupAt-Date.now()));this.timer.unref();
    };
    arm();
  }
  async ensureSpace(bytes=0,dir=this.config.dataDir) {
    const disk=await fs.statfs(dir);
    if(disk.bavail*disk.bsize < this.o.min_free_space_mb*1048576+bytes) throw new HttpError(507,'Insufficient free disk space; export or remove old archives');
  }
  async pruneRevisions() {
    if(!this.o.revisions_max_age_days) return;
    const cutoff=Date.now()-this.o.revisions_max_age_days*86400000;
    for(const entry of await fs.readdir(this.revisionsDir,{withFileTypes:true})) {
      if(!entry.isDirectory() || !/^[A-Za-z0-9_-]{1,128}$/.test(entry.name)) continue;
      const dir=path.join(this.revisionsDir,entry.name);
      for(const name of await fs.readdir(dir)) if(/^\d+-[a-f0-9-]+\.json$/.test(name) && Number(name.split('-')[0]) < cutoff) await fs.unlink(path.join(dir,name));
    }
  }
  async serial(fn) {
    const result = this.queue.then(fn);
    this.queue = result.catch(()=>{});
    return result;
  }
  requireStorage(write = false) {
    if (!this.o.storage_enabled) throw new HttpError(503,'Server storage is disabled');
    if (write && this.o.read_only) throw new HttpError(403,'Read-only mode');
  }
  file(id) { return path.join(this.dir,`${validId(id)}.json`); }
  async read(id) {
    this.requireStorage();
    try { return JSON.parse(await readFileSafe(this.file(id))); }
    catch (e) { if (e.code === 'ENOENT') throw new HttpError(404,'Diagram not found'); throw e; }
  }
  async list() {
    this.requireStorage();
    const result = [];
    for (const file of (await fs.readdir(this.dir)).filter(f=>/^[A-Za-z0-9_-]{1,128}\.json$/.test(f))) {
      try {
        const text = await readFileSafe(path.join(this.dir,file)); const d = JSON.parse(text); validateDiagram(d);
        const modified=typeof d.lastModified === 'string' && Number.isFinite(Date.parse(d.lastModified)) ? d.lastModified : (await fs.stat(path.join(this.dir,file))).mtime.toISOString();
        result.push({id:file.slice(0,-5), name:d.name || d.title, created:typeof d.created === 'string' && Number.isFinite(Date.parse(d.created)) ? d.created : modified, lastModified:modified, size:Buffer.byteLength(text), etag:etag(d)});
      } catch(e) { this.log('warning',`Skipped invalid diagram ${file}: ${e.message}`); }
    }
    return result.sort((a,b)=>this.o.diagram_sort === 'name' ? a.name.localeCompare(b.name,this.o.language) : String(this.o.diagram_sort === 'created' ? b.created || b.lastModified : b.lastModified).localeCompare(String(this.o.diagram_sort === 'created' ? a.created || a.lastModified : a.lastModified)));
  }
  async revision(id, data) {
    if (!this.o.revisions_keep) return;
    const dir = path.join(this.revisionsDir,validId(id));
    await fs.mkdir(dir,{recursive:true, mode:0o700});
    const revision = `${Date.now()}-${randomUUID()}`;
    await atomicWrite(path.join(dir,`${revision}.json`),JSON.stringify(data));
    const files = (await fs.readdir(dir)).filter(f=>/^\d+-[a-f0-9-]+\.json$/.test(f)).sort().reverse();
    for (const file of files.slice(this.o.revisions_keep)) await fs.unlink(path.join(dir,file));
  }
  async save(id, data, {create=false, expected} = {}) {
    this.requireStorage(true); id = validId(id); data = validateDiagram(data);
    if (Buffer.byteLength(JSON.stringify(data)) > this.o.max_diagram_size_mb*1048576) throw new HttpError(413,'Diagram is too large');
    return this.serial(async()=>{
      let old;
      try { old = await this.read(id); } catch(e) { if(e.status !== 404) throw e; }
      if (create && old) throw new HttpError(409,'Diagram already exists');
      if (!create && !old) throw new HttpError(404,'Diagram not found');
      if (old && !expected) throw new HttpError(428,'If-Match is required');
      if (old && expected !== etag(old)) throw new HttpError(412,'Diagram changed on another device. Reload before saving.');
      if (!old && (await this.list()).length >= this.o.max_diagrams) throw new HttpError(409,'Diagram limit reached');
      await this.ensureSpace(Buffer.byteLength(JSON.stringify(data))+ (old && this.o.revisions_keep ? Buffer.byteLength(JSON.stringify(old)) : 0)+2048);
      if (old) await this.revision(id,old);
      const now = new Date().toISOString();
      const saved = {...data,id,created:old?.created || now,lastModified:now};
      await atomicWrite(this.file(id),JSON.stringify(saved));
      return saved;
    });
  }
  async remove(id, expected) {
    this.requireStorage(true);
    return this.serial(async()=>{
      const old = await this.read(id);
      if (!expected) throw new HttpError(428,'If-Match is required');
      if (expected !== etag(old)) throw new HttpError(412,'Diagram changed; refresh the list');
      if(this.o.trash_keep_days) {
        const entry = {deletedAt:new Date().toISOString(),diagram:old};
        await this.ensureSpace(Buffer.byteLength(JSON.stringify(entry)));
        await atomicWrite(path.join(this.trashDir,`${Date.now()}-${randomUUID()}.json`),JSON.stringify(entry));
      }
      await fs.unlink(this.file(id));
      await fs.rm(path.join(this.revisionsDir,validId(id)),{recursive:true,force:true});
      await this.pruneTrash();
    });
  }
  async revisions(id) {
    this.requireStorage(); const dir = path.join(this.revisionsDir,validId(id));
    let files; try { files = await fs.readdir(dir); } catch(e) { if(e.code === 'ENOENT') return []; throw e; }
    const cutoff=this.o.revisions_max_age_days ? Date.now()-this.o.revisions_max_age_days*86400000 : 0;
    return files.filter(f=>/^\d+-[a-f0-9-]+\.json$/.test(f) && Number(f.split('-')[0]) >= cutoff).sort().reverse().map(f=>({id:f.slice(0,-5),date:new Date(Number(f.split('-')[0])).toISOString()}));
  }
  async readRevision(id, revision) {
    this.requireStorage(); validId(id);
    if (!/^\d+-[a-f0-9-]+$/.test(revision)) throw new HttpError(400,'Invalid revision ID');
    if(this.o.revisions_max_age_days && Number(revision.split('-')[0]) < Date.now()-this.o.revisions_max_age_days*86400000) throw new HttpError(410,'Revision expired');
    try { return JSON.parse(await readFileSafe(path.join(this.revisionsDir,id,`${revision}.json`))); }
    catch(e) { if(e.code === 'ENOENT') throw new HttpError(404,'Revision not found'); throw e; }
  }
  async bundle() {
    this.requireStorage();
    const diagrams = []; let size = 0;
    for (const d of await this.list()) {
      size += d.size;
      if(size > this.o.backup_max_size_mb*1048576-4096) throw new HttpError(413,'Backup size limit reached; export individual diagrams or use Home Assistant backup');
      diagrams.push(await this.read(d.id));
    }
    const bundle={format:'fossflow-ha-backup',version:1,created:new Date().toISOString(),diagrams};
    if(Buffer.byteLength(JSON.stringify(bundle)) > this.o.backup_max_size_mb*1048576) throw new HttpError(413,'Backup size limit reached');
    return bundle;
  }
  async prune(dir,keep=this.o.backup_keep) {
    const files = (await fs.readdir(dir)).filter(f=>/^fossflow-\d+-[a-f0-9-]+\.json$/.test(f)).sort().reverse();
    const cutoff=this.o.backup_keep_days ? Date.now()-this.o.backup_keep_days*86400000 : 0;
    for(const [i,file] of files.entries()) if(i >= keep || Number(file.split('-')[1]) < cutoff) await fs.unlink(path.join(dir,file));
  }
  async backup({scheduled=false}={}) {
    this.requireStorage(true);
    return this.serial(async()=>{
      const bundle = await this.bundle(); const text = JSON.stringify(bundle);
      if(scheduled && this.o.backup_skip_empty && !bundle.diagrams.length) return {skipped:'empty',count:0};
      if(scheduled && this.o.backup_deduplicate) {
        const latest=(await this.backups())[0];
        if(latest) {
          try { if(JSON.stringify((await this.readBackup(latest.name)).diagrams) === JSON.stringify(bundle.diagrams)) return {skipped:'unchanged',count:bundle.diagrams.length}; }
          catch(e) { this.log('warning',`Previous backup unavailable: ${e.message}`); }
        }
      }
      await this.ensureSpace(Buffer.byteLength(text));
      const name = `fossflow-${Date.now()}-${randomUUID()}.json`;
      await atomicWrite(path.join(this.backupDir,name),text); await this.prune(this.backupDir);
      let shared = false;
      if(this.o.backup_to_share) {
        try {
          await fs.mkdir(this.config.shareDir,{recursive:true,mode:0o700});
          await this.ensureSpace(Buffer.byteLength(text),this.config.shareDir);
          await atomicWrite(path.join(this.config.shareDir,name),text); await this.prune(this.config.shareDir,this.o.backup_share_keep); shared = true;
        } catch(e) { this.log('warning',`Local backup saved, share copy failed: ${e.message}`); }
      }
      this.log('info',`Backup saved (${bundle.diagrams.length} diagrams)`);
      return {name,count:bundle.diagrams.length,shared};
    });
  }
  async exportBundle() { return this.serial(()=>this.bundle()); }
  archiveFile(dir, id, backup=false) {
    if(!(backup ? /^fossflow-\d+-[a-f0-9-]+\.json$/ : /^\d+-[a-f0-9-]+$/).test(id)) throw new HttpError(400,'Invalid archive ID');
    return path.join(dir,backup ? id : `${id}.json`);
  }
  async pruneTrash() {
    const files=(await fs.readdir(this.trashDir)).filter(f=>/^\d+-[a-f0-9-]+\.json$/.test(f)).sort().reverse();
    const cutoff=Date.now()-this.o.trash_keep_days*86400000;
    for(const [i,file] of files.entries()) if(i >= this.o.trash_max || Number(file.split('-')[0]) < cutoff || !this.o.trash_keep_days) await fs.unlink(path.join(this.trashDir,file));
  }
  async trash() {
    this.requireStorage(); const result=[]; const cutoff=Date.now()-this.o.trash_keep_days*86400000;
    for(const file of (await fs.readdir(this.trashDir)).filter(f=>/^\d+-[a-f0-9-]+\.json$/.test(f)).sort().reverse()) {
      if(!this.o.trash_keep_days || Number(file.split('-')[0]) < cutoff) continue;
      try { const entry=JSON.parse(await readFileSafe(path.join(this.trashDir,file))); const d=validateDiagram(entry.diagram);
        result.push({id:file.slice(0,-5),name:d.name,deletedAt:entry.deletedAt});
      } catch(e) { this.log('warning',`Skipped invalid trash entry: ${e.message}`); }
    }
    return result;
  }
  async restoreTrash(id) {
    this.requireStorage(true);
    const file=this.archiveFile(this.trashDir,id);
    return this.serial(async()=>{
      let entry; try { entry=JSON.parse(await readFileSafe(file)); } catch(e) { if(e.code === 'ENOENT') throw new HttpError(404,'Trash entry not found'); throw e; }
      if(!this.o.trash_keep_days || Number(id.split('-')[0]) < Date.now()-this.o.trash_keep_days*86400000) throw new HttpError(410,'Trash entry expired');
      if((await this.list()).length >= this.o.max_diagrams) throw new HttpError(409,'Diagram limit reached');
      const d=validateDiagram(entry.diagram);
      if(Buffer.byteLength(JSON.stringify(d)) > this.o.max_diagram_size_mb*1048576) throw new HttpError(413,'Diagram is too large');
      const newId=randomUUID(),now=new Date().toISOString();
      await this.ensureSpace(Buffer.byteLength(JSON.stringify(d))+1024);
      await atomicWrite(this.file(newId),JSON.stringify({...d,id:newId,created:now,lastModified:now}));
      await fs.unlink(file);return {id:newId};
    });
  }
  async removeArchive(id,backup=false) {
    this.requireStorage(true); const file=this.archiveFile(backup ? this.backupDir : this.trashDir,id,backup);
    return this.serial(async()=>{
      try { await readFileSafe(file); await fs.unlink(file); } catch(e) { if(e.code === 'ENOENT') throw new HttpError(404,'Archive not found'); throw e; }
    });
  }
  async backups() {
    this.requireStorage();const result=[];
    for(const name of (await fs.readdir(this.backupDir)).filter(f=>/^fossflow-\d+-[a-f0-9-]+\.json$/.test(f)).sort().reverse()) {
      try {
        const stat=await fs.lstat(path.join(this.backupDir,name));const date=new Date(Number(name.split('-')[1]));
        if(stat.isFile() && !stat.isSymbolicLink() && Number.isFinite(date.getTime())) result.push({name,size:stat.size,date:date.toISOString()});
      } catch(e) { if(e.code !== 'ENOENT') throw e; } // Retention may delete a file during listing.
    }
    return result;
  }
  async readBackup(name) {
    this.requireStorage(); const file=this.archiveFile(this.backupDir,name,true);
    try { const stat=await fs.lstat(file); if(stat.size > this.o.backup_max_size_mb*1048576) throw new HttpError(413,'Backup exceeds configured size limit');
      return JSON.parse(await readFileSafe(file));
    } catch(e) { if(e.code === 'ENOENT') throw new HttpError(404,'Backup not found'); throw e; }
  }
  async diagnostics() {
    const disk=await fs.statfs(this.config.dataDir);
    const diagrams=this.o.storage_enabled ? await this.list() : [];
    const backups=this.o.storage_enabled ? await this.backups() : [];
    const trash=this.o.storage_enabled ? await this.trash() : [];
    return {version:this.config.version,uptimeSeconds:Math.floor(process.uptime()),storageEnabled:this.o.storage_enabled,readOnly:this.o.read_only,
      diagrams:diagrams.length,diagramBytes:diagrams.reduce((n,d)=>n+d.size,0),backups:backups.length,backupBytes:backups.reduce((n,b)=>n+b.size,0),trash:trash.length,
      diskFreeBytes:disk.bavail*disk.bsize,
      backupIntervalHours:this.o.backup_interval_hours,backupOnStart:this.o.backup_on_start,
      backupOnShutdown:this.o.backup_on_shutdown,lastBackupAt:backups[0]?.date || null,nextBackupAt:this.nextBackupAt ? new Date(this.nextBackupAt).toISOString() : null,
      nodeVersion:process.versions.node,architecture:process.arch,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,
      limits: {diagrams:this.o.max_diagrams,diagramSizeMb:this.o.max_diagram_size_mb,backupSizeMb:this.o.backup_max_size_mb,revisions:this.o.revisions_keep,trashDays:this.o.trash_keep_days,minFreeSpaceMb:this.o.min_free_space_mb,backupKeepDays:this.o.backup_keep_days,revisionMaxAgeDays:this.o.revisions_max_age_days}};
  }
  async restore(bundle) {
    this.requireStorage(true);
    if(bundle?.format !== 'fossflow-ha-backup' || bundle.version !== 1 || !Array.isArray(bundle.diagrams)) throw new HttpError(400,'Invalid backup format');
    if(Buffer.byteLength(JSON.stringify(bundle)) > this.o.backup_max_size_mb*1048576) throw new HttpError(413,'Backup exceeds configured size limit');
    if(bundle.diagrams.length > this.o.max_diagrams) throw new HttpError(400,'Too many diagrams');
    const validated = bundle.diagrams.map(d=>validateDiagram(d));
    for(const d of validated) if(Buffer.byteLength(JSON.stringify(d)) > this.o.max_diagram_size_mb*1048576) throw new HttpError(413,'Diagram is too large');
    return this.serial(async()=>{
      if((await this.list()).length + validated.length > this.o.max_diagrams) throw new HttpError(409,'Diagram limit reached');
      await this.ensureSpace(Buffer.byteLength(JSON.stringify(validated))+validated.length*1024);
      const written = [];
      try {
        for(const d of validated) {
          const id = randomUUID(); const now = new Date().toISOString();
          await atomicWrite(this.file(id),JSON.stringify({...d,id,created:now,lastModified:now})); written.push(id);
        }
      } catch(e) { for(const id of written) await fs.unlink(this.file(id)).catch(()=>{}); throw e; }
      return {count:written.length};
    });
  }
}
