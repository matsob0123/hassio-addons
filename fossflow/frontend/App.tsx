import { useState, useEffect, useRef, useCallback } from 'react';
import { Isoflow, modelSchema } from 'fossflow';
import { flattenCollections } from '@isoflow/isopacks/dist/utils';
import isoflow from '@isoflow/isopacks/dist/isoflow';
import aws from '@isoflow/isopacks/dist/aws';
import gcp from '@isoflow/isopacks/dist/gcp';
import azure from '@isoflow/isopacks/dist/azure';
import kubernetes from '@isoflow/isopacks/dist/kubernetes';
import './App.css';

const config = (window as any).__FOSSFLOW__;
const icons = flattenCollections([isoflow,aws,gcp,azure,kubernetes]);
const builtin = new Set(icons.map(i=>i.id));
const colors = [{id:'blue',value:'#126b91'},{id:'green',value:'#18875b'},{id:'red',value:'#cc4545'},{id:'orange',value:'#cc7c20'},{id:'purple',value:'#8261ba'},{id:'gray',value:'#627487'},{id:'black',value:'#202830'}];
const menu: any = ['EXPORT.PNG','VERSION'];
const empty = () => ({title:config.defaultDiagramName,icons,colors,items:[],views:[],fitToView:true});
const texts = {
  pl: {new:'Nowy',open:'Diagramy',save:'Zapisz',copy:'Zapisz kopię',import:'Import JSON',export:'Eksport JSON',backups:'Kopie',history:'Historia',close:'Zamknij',delete:'Usuń',load:'Otwórz',restore:'Wczytaj wersję',search:'Szukaj diagramu…',name:'Nazwa diagramu',saved:'Zapisano na serwerze',dirty:'Niezapisane zmiany',draft:'Szkic w przeglądarce',busy:'Zapisywanie…',ready:'Gotowy',readonly:'Tylko do odczytu',confirm:'Odrzucić niezapisane zmiany?',deleteConfirm:'Usunąć diagram? Odzyskiwanie jest dostępne w koszu, jeśli retencja jest włączona.',backupNow:'Utwórz kopię teraz',downloadBackup:'Pobierz wszystkie diagramy',restoreBackup:'Importuj kopię jako nowe diagramy',backupHint:'Import kopii tworzy nowe diagramy i zachowuje istniejące. Kopie obejmują zapisane diagramy, bez bieżącego szkicu.',backupDone:'Utworzono kopię',imported:'Zaimportowano',empty:'Brak zapisanych diagramów.',noHistory:'Brak poprzednich wersji. Najpierw zapisz diagram.',conflict:'Diagram zmienił się na innym urządzeniu. Pobierz bieżącą wersję z listy Diagramy lub zapisz swoją kopię. Automatyczny zapis wstrzymano.',error:'Operacja nie powiodła się',recovery:'Odzyskaj szkic',logout:'Wyloguj',help:'Edytor',helpText:'Dodawaj urządzenia przyciskiem + w edytorze. Menu edytora zawiera eksport PNG, cofanie zmian i ustawienia skrótów. Po pierwszym zapisie edycje zapisują się automatycznie na serwerze. Wbudowane narzędzia FossFLOW pozostają w języku angielskim.',local:'Zapis serwerowy wyłączony. Eksportuj diagram do pliku JSON.',newName:'Moja sieć',invalid:'Nieprawidłowy diagram. Użyj pełnego eksportu JSON FossFLOW.',size:'Plik jest za duży.',rename:'Zmiana nazwy wymaga zapisu.',network:'Brak połączenia. Szkic zachowano w przeglądarce.'},
  en: {new:'New',open:'Diagrams',save:'Save',copy:'Save a copy',import:'Import JSON',export:'Export JSON',backups:'Backups',history:'History',close:'Close',delete:'Delete',load:'Open',restore:'Load revision',search:'Search diagrams…',name:'Diagram name',saved:'Saved on server',dirty:'Unsaved changes',draft:'Browser draft',busy:'Saving…',ready:'Ready',readonly:'Read only',confirm:'Discard unsaved changes?',deleteConfirm:'Delete diagram? Recovery is available in Trash when retention is enabled.',backupNow:'Create backup now',downloadBackup:'Download all diagrams',restoreBackup:'Import backup as new diagrams',backupHint:'Backup import creates new diagrams and preserves existing ones. Backups include saved diagrams, not the current draft.',backupDone:'Backup created',imported:'Imported',empty:'No saved diagrams.',noHistory:'No previous revisions. Save the diagram first.',conflict:'Another device changed this diagram. Open its current version from Diagrams or save your own copy. Autosave is paused.',error:'Operation failed',recovery:'Recover draft',logout:'Sign out',help:'Editor',helpText:'Add devices using + in the editor. Its menu includes PNG export, undo and hotkey settings. After the first save, edits are saved automatically on the server. FossFLOW tools remain in English.',local:'Server storage is disabled. Export your diagram to a JSON file.',newName:'My network',invalid:'Invalid diagram. Use a full FossFLOW JSON export.',size:'The file is too large.',rename:'Rename requires saving.',network:'Connection failed. Your browser draft is preserved.'}
};
const t = texts[config.language as 'pl'|'en'] || texts.en;
Object.assign(texts.pl,{trash:'Kosz',diagnostics:'Diagnostyka',download:'Pobierz',restoreDeleted:'Odzyskaj',purge:'Usuń trwale',purgeConfirm:'Trwale usunąć tę pozycję?',restoreConfirm:'Importować kopię jako nowe diagramy?',trashEmpty:'Kosz jest pusty.',trashHint:'Odzyskiwanie tworzy nowy diagram. Retencja kosza w dniach:',storedBackups:'Kopie zapisane na serwerze',backupEmpty:'Brak kopii na serwerze.',diagnosticsHint:'Ustawienia globalne zmienisz w Home Assistant → FossFLOW → Konfiguracja. Skróty: Ctrl/Cmd+S zapis, Ctrl/Cmd+Shift+S kopia, Esc zamyka okno.',offline:'Brak połączenia',refresh:'Odśwież'});
Object.assign(texts.en,{trash:'Trash',diagnostics:'Diagnostics',download:'Download',restoreDeleted:'Recover',purge:'Delete permanently',purgeConfirm:'Permanently delete this entry?',restoreConfirm:'Import backup as new diagrams?',trashEmpty:'Trash is empty.',trashHint:'Recovery creates a new diagram. Trash retention in days:',storedBackups:'Backups saved on the server',backupEmpty:'No server backups.',diagnosticsHint:'Change global options in Home Assistant → FossFLOW → Configuration. Shortcuts: Ctrl/Cmd+S save, Ctrl/Cmd+Shift+S copy, Esc closes dialog.',offline:'Offline',refresh:'Refresh'});
const extra:any = texts[config.language as 'pl'|'en'] || texts.en;
const draftKey = `fossflow-ha-draft:${config.basePath}`;
const apiUrl = (p:string) => `${config.basePath}${p.replace(/^\//,'')}`;
async function request(p:string, init:RequestInit = {}) {
  let r: Response;
  try { r = await fetch(apiUrl(p),{...init,headers:{...(init.body ? {'Content-Type':'application/json'} : {}),...init.headers}}); }
  catch { throw new Error(t.network); }
  if(!r.ok) {
    const data = await r.json().catch(()=>({}));
    const e:any = new Error(r.status === 412 ? t.conflict : (data.error || `${t.error}: ${r.status}`)); e.status=r.status; throw e;
  }
  return {data:await r.json(),etag:r.headers.get('etag')};
}
function packed(model:any,name:string) {
  return {...model,name,title:name,icons:(model.icons || []).filter((i:any)=>!builtin.has(i.id) || i.collection === 'imported')};
}
function unpack(data:any) {
  if(!data || !Array.isArray(data.icons)) throw new Error(t.invalid);
  // Imported definitions take precedence over built-ins with the same ID.
  const merged = new Map(icons.map(i=>[i.id,i])); data.icons.forEach((i:any)=>merged.set(i.id,i));
  const model = {...data,title:data.title || data.name || t.newName,icons:[...merged.values()],colors:data.colors?.length ? data.colors : colors,fitToView:true};
  if(!modelSchema.safeParse(model).success) throw new Error(t.invalid);
  return model;
}
function download(data:any,name:string) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function App() {
  const [initial,setInitial]=useState<any>(empty); const [editorKey,setEditorKey]=useState(0);
  const [name,setName]=useState(config.defaultDiagramName);const [id,setId]=useState<string|null>(null);
  const [dirty,setDirty]=useState(false);const [busy,setBusy]=useState(false);const [conflict,setConflict]=useState(false);
  const [message,setMessage]=useState('');const [modal,setModal]=useState('');const [list,setList]=useState<any[]>([]);
  const [revisions,setRevisions]=useState<any[]>([]);const [search,setSearch]=useState('');const [recoverable,setRecoverable]=useState(false);
  const [archives,setArchives]=useState<any[]>([]);const [trash,setTrash]=useState<any[]>([]);const [diagnostics,setDiagnostics]=useState<any>(null);const [online,setOnline]=useState(navigator.onLine);
  const [editVersion,setEditVersion]=useState(0);const [lastSave,setLastSave]=useState('');
  const fileInput=useRef<HTMLInputElement>(null);const backupInput=useRef<HTMLInputElement>(null);
  const modelRef=useRef<any>(initial);const etagRef=useRef<string|null>(null);const versionRef=useRef(0);
  const skipFirst=useRef(true);const savingRef=useRef(false);const fingerprint=useRef('');
  const baselineTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const current=useRef<any>({});current.current={id,name,dirty,busy,conflict};
  const draft = useCallback(()=>{
    if(!config.browserDrafts)return;
    try { localStorage.setItem(draftKey,JSON.stringify({data:packed(modelRef.current,current.current.name),date:new Date().toISOString()}));setRecoverable(true); }
    catch { /* Export remains available when browser storage is full. */ }
  },[]);
  const changed=useCallback((model:any)=>{
    modelRef.current=model;
    const next=JSON.stringify(packed(model,current.current.name));
    // Isoflow emits the previous store before its initialized model. Wait for
    // the loaded model's title and generated initial view before establishing a baseline.
    if(skipFirst.current) {
      fingerprint.current=next;
      if(baselineTimer.current)clearTimeout(baselineTimer.current);
      if(model.title === current.current.name && model.views?.length) baselineTimer.current=setTimeout(()=>{skipFirst.current=false;},50);
      return;
    }
    if(next === fingerprint.current) return;
    fingerprint.current=next;versionRef.current++;setEditVersion(versionRef.current);setDirty(true);
  },[]);
  useEffect(()=>{
    document.documentElement.lang=config.language;
    const media=matchMedia('(prefers-color-scheme: dark)');
    const apply=()=>document.documentElement.dataset.theme=config.theme === 'system' ? (media.matches ? 'dark' : 'light') : config.theme;
    apply();media.addEventListener('change',apply);
    try {setRecoverable(config.browserDrafts && !!localStorage.getItem(draftKey));}catch{}
    return ()=>media.removeEventListener('change',apply);
  },[]);
  useEffect(()=>{
    if(!dirty) return;
    const timer=setTimeout(draft,500);return ()=>clearTimeout(timer);
  },[editVersion,dirty,name,draft]);
  useEffect(()=>{
    const before=(e:BeforeUnloadEvent)=>{if(current.current.dirty){draft();e.preventDefault();e.returnValue='';}};
    window.addEventListener('beforeunload',before);return ()=>window.removeEventListener('beforeunload',before);
  },[draft]);
  const save=useCallback(async(copy=false)=>{
    if(savingRef.current || config.readOnly || !config.storageEnabled) return;
    const name=current.current.name.trim();if(!name) return;
    const oldId=copy ? null : current.current.id;const generation=versionRef.current;
    const data=packed(modelRef.current,name);savingRef.current=true;setBusy(true);setMessage('');
    try {
      const r=await request(oldId ? `api/diagrams/${oldId}` : 'api/diagrams',{
        method:oldId ? 'PUT':'POST',headers:oldId && etagRef.current ? {'If-Match':etagRef.current} : {},body:JSON.stringify(data)
      });
      etagRef.current=r.etag;setId(r.data.id);setConflict(false);setLastSave(new Date().toLocaleTimeString());
      if(generation === versionRef.current){setDirty(false);try{localStorage.removeItem(draftKey);setRecoverable(false);}catch{}}
    }catch(e:any){setMessage(e.message);if(e.status === 412)setConflict(true);draft();}
    finally{savingRef.current=false;setBusy(false);}
  },[draft]);
  useEffect(()=>{
    if(!dirty || !id || conflict || busy || !config.autosaveSeconds || config.readOnly || !config.storageEnabled) return;
    const timer=setTimeout(()=>save(),config.autosaveSeconds*1000);return ()=>clearTimeout(timer);
  },[dirty,id,conflict,busy,editVersion,name,save]);
  function canSwitch(){return !savingRef.current && (!current.current.dirty || window.confirm(t.confirm));}
  function activate(data:any,newId:string|null=null,newEtag:string|null=null,unsaved=false){
    const model=unpack(data);if(baselineTimer.current)clearTimeout(baselineTimer.current);skipFirst.current=true;modelRef.current=model;etagRef.current=newEtag;
    setInitial(model);setEditorKey(k=>k+1);setId(newId);setName(data.name || data.title || t.newName);
    setDirty(unsaved);setConflict(false);setMessage('');setModal('');setLastSave('');versionRef.current++;setEditVersion(versionRef.current);
    if(unsaved && config.browserDrafts){try{localStorage.setItem(draftKey,JSON.stringify({data,date:new Date().toISOString()}));setRecoverable(true);}catch{}}
  }
  async function openList(){setModal('diagrams');setSearch('');try{setList((await request('api/diagrams')).data);}catch(e:any){setMessage(e.message);}}
  async function load(d:any){if(!canSwitch())return;try{const r=await request(`api/diagrams/${d.id}`);activate(r.data,d.id,r.etag);}catch(e:any){setMessage(e.message);}}
  async function remove(d:any){if(!window.confirm(t.deleteConfirm))return;try{await request(`api/diagrams/${d.id}`,{method:'DELETE',headers:{'If-Match':d.etag}});if(d.id === id){setId(null);setDirty(true);}await openList();}catch(e:any){setMessage(e.message);}}
  async function importFile(file:File|undefined,isBackup=false){
    if(!file)return;if(file.size > (isBackup ? config.backupMaxSizeMb : config.maxDiagramSizeMb)*1048576){setMessage(t.size);return;}
    try{const data=JSON.parse(await file.text());
      if(isBackup){const r=await request('api/backups/restore',{method:'POST',body:JSON.stringify(data)});setMessage(`${t.imported}: ${r.data.count}`);}
      else if(canSwitch())activate(data,null,null,true);
    }catch(e:any){setMessage(e.message);}
  }
  async function history(){if(!id)return;setModal('history');try{setRevisions((await request(`api/diagrams/${id}/revisions`)).data);}catch(e:any){setMessage(e.message);}}
  async function loadRevision(rev:any){if(!id || !canSwitch())return;try{const r=await request(`api/diagrams/${id}/revisions/${rev.id}`);activate(r.data,id,etagRef.current,true);}catch(e:any){setMessage(e.message);}}
  async function backupNow(){try{const r=await request('api/backups',{method:'POST',body:'{}'});setMessage(`${t.backupDone}: ${r.data.count}${r.data.shared ? ' · /share' : ''}`);setArchives((await request('api/backups')).data);}catch(e:any){setMessage(e.message);}}
  async function recover(){if(!canSwitch())return;try{const d=JSON.parse(localStorage.getItem(draftKey) || '{}');activate(d.data,null,null,true);}catch(e:any){setMessage(e.message);}}
  async function openBackups(){setModal('backups');try{setArchives((await request('api/backups')).data);}catch(e:any){setMessage(e.message);}}
  async function openTrash(){setModal('trash');try{setTrash((await request('api/trash')).data);}catch(e:any){setMessage(e.message);}}
  async function openDiagnostics(){setModal('diagnostics');try{setDiagnostics((await request('api/diagnostics')).data);}catch(e:any){setMessage(e.message);}}
  async function archiveAction(d:any,action:string,isTrash=false){
    try{
      const path=`api/${isTrash ? 'trash' : 'backups'}/${isTrash ? d.id : d.name}`;
      if(action === 'download'){download((await request(path)).data,d.name);return;}
      if(action === 'delete'){
        if(!window.confirm(extra.purgeConfirm))return;
        await request(path,{method:'DELETE'});
      }else{
        if(!isTrash && !window.confirm(extra.restoreConfirm))return;
        const r=await request(`${path}/restore`,{method:'POST',body:'{}'});
        setMessage(`${t.imported}: ${isTrash ? 1 : r.data.count}`);
      }
      if(isTrash)await openTrash();else await openBackups();
    }catch(e:any){setMessage(e.message);}
  }
  useEffect(()=>{
    const update=()=>setOnline(navigator.onLine);
    window.addEventListener('online',update);window.addEventListener('offline',update);
    return ()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){e.preventDefault();if(!current.current.conflict || e.shiftKey)save(e.shiftKey);}};
    window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);
  },[save]);
  useEffect(()=>{
    if(!modal)return;
    const previous=document.activeElement as HTMLElement;
    const dialog=document.querySelector('.ha-dialog') as HTMLElement;
    const controls=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]'));
    controls()[0]?.focus();
    const key=(e:KeyboardEvent)=>{if(e.key === 'Escape'){e.preventDefault();setModal('');}if(e.key === 'Tab'){const all=controls();if(!all.length)return;const first=all[0],last=all[all.length-1];if(e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey && document.activeElement === last){e.preventDefault();first.focus();}}};
    window.addEventListener('keydown',key);return ()=>{window.removeEventListener('keydown',key);previous?.focus();};
  },[modal]);
  useEffect(()=>{
    if(config.startupDiagram !== 'latest' || !config.storageEnabled)return;
    let cancelled=false;const generation=versionRef.current;
    (async()=>{
      try{
        if(config.browserDrafts && localStorage.getItem(draftKey))return;
        const diagrams=(await request('api/diagrams')).data.sort((a:any,b:any)=>b.lastModified.localeCompare(a.lastModified));
        if(!diagrams.length)return;
        const d=diagrams[0],r=await request(`api/diagrams/${d.id}`);
        if(!cancelled && versionRef.current === generation && !current.current.dirty)activate(r.data,d.id,r.etag);
      }catch(e:any){if(!cancelled)setMessage(e.message);}
    })();return ()=>{cancelled=true;};
  },[]);
  const modalTitle=modal === 'diagrams' ? t.open : modal === 'history' ? t.history : modal === 'backups' ? t.backups : modal === 'trash' ? extra.trash : modal === 'diagnostics' ? extra.diagnostics : t.help;
  const writable=!config.readOnly;const serverWritable=writable && config.storageEnabled;
  return <div className="ha-app">
    <header className="ha-toolbar"><div className="ha-brand">FossFLOW <span>Home Assistant</span></div>
      <div className="ha-actions">
        <button disabled={!writable || busy} onClick={()=>{if(canSwitch())activate(empty());}}>{t.new}</button>
        <button disabled={!config.storageEnabled || busy} onClick={openList}>{t.open}</button>
        <button className="ha-primary" disabled={!serverWritable || busy || conflict || !name.trim()} onClick={()=>save()}>{t.save}</button>
        <button disabled={!serverWritable || busy || !name.trim()} onClick={()=>save(true)}>{t.copy}</button>
        <button disabled={!writable || busy} onClick={()=>fileInput.current?.click()}>{t.import}</button>
        <button onClick={()=>download({...modelRef.current,title:name,name},`${name.replace(/[^\p{L}\p{N}_-]/gu,'_') || 'diagram'}.json`)}>{t.export}</button>
        <button disabled={!config.storageEnabled || busy} onClick={openBackups}>{t.backups}</button>
        <button disabled={!id || busy} onClick={history}>{t.history}</button>
        <button disabled={!config.storageEnabled || busy} onClick={openTrash}>{extra.trash}</button><button onClick={openDiagnostics}>{extra.diagnostics}</button>
        <button onClick={()=>setModal('help')}>{t.help}</button>
      </div>
    </header>
    <section className="ha-statusbar">
      <input aria-label={t.name} value={name} maxLength={100} disabled={!writable || busy} onChange={e=>{setName(e.target.value);setDirty(true);versionRef.current++;setEditVersion(versionRef.current);}}/>
      <span role="status">{!online ? extra.offline : config.readOnly ? t.readonly : busy ? t.busy : dirty ? t.dirty : lastSave ? `${t.saved} · ${lastSave}` : t.ready}</span>
      {recoverable && !dirty && <button onClick={recover}>{t.recovery}</button>}
      {!config.ingress && <button onClick={async()=>{if(canSwitch()){await fetch('/auth/logout',{method:'POST'});location.reload();}}}>{t.logout}</button>}
    </section>
    {!config.storageEnabled && <div className="ha-notice">{t.local}</div>}
    {message && <div className="ha-notice" role="alert">{message}<button aria-label={t.close} onClick={()=>setMessage('')}>×</button></div>}
    <main className="ha-canvas" onPointerDownCapture={()=>{if(baselineTimer.current)clearTimeout(baselineTimer.current);skipFirst.current=false;fingerprint.current=JSON.stringify(packed(modelRef.current,current.current.name));}} onKeyDownCapture={()=>{if(baselineTimer.current)clearTimeout(baselineTimer.current);skipFirst.current=false;}}><Isoflow key={editorKey} initialData={initial} onModelUpdated={changed} mainMenuOptions={menu} renderer={{backgroundColor:'var(--ha-bg)',showGrid:config.editorGrid}} editorMode={config.readOnly ? 'EXPLORABLE_READONLY' : 'EDITABLE'}/></main>
    <input ref={fileInput} data-testid="ha-import-file" type="file" accept=".json,application/json" hidden onChange={e=>{importFile(e.target.files?.[0]);e.target.value='';}}/>
    <input ref={backupInput} data-testid="ha-import-backup" type="file" accept=".json,application/json" hidden onChange={e=>{importFile(e.target.files?.[0],true);e.target.value='';}}/>
    {modal && <div className="ha-overlay" onClick={e=>{if(e.target === e.currentTarget)setModal('');}}><section role="dialog" aria-modal="true" aria-label={modalTitle} className="ha-dialog">
      <div className="ha-dialog-title"><h2>{modalTitle}</h2><button onClick={()=>setModal('')}>{t.close}</button></div>
      {modal === 'diagrams' && <><input aria-label={t.search} placeholder={t.search} value={search} onChange={e=>setSearch(e.target.value)}/>{!list.length && <p>{t.empty}</p>}<div className="ha-list">{list.filter(d=>d.name.toLowerCase().includes(search.toLowerCase())).map(d=><div className="ha-row" key={d.id}><div><strong>{d.name}</strong><small>{new Date(d.lastModified).toLocaleString()} · {Math.ceil(d.size/1024)} KB</small></div><button onClick={()=>load(d)}>{t.load}</button>{serverWritable && <button className="ha-danger" onClick={()=>remove(d)}>{t.delete}</button>}</div>)}</div></>}
      {modal === 'history' && <>{!revisions.length && <p>{t.noHistory}</p>}{revisions.map(r=><div className="ha-row" key={r.id}><span>{new Date(r.date).toLocaleString()}</span><button disabled={!writable} onClick={()=>loadRevision(r)}>{t.restore}</button></div>)}</>}
      {modal === 'backups' && <><p>{t.backupHint}</p><div className="ha-backup-actions"><button disabled={!serverWritable} onClick={backupNow}>{t.backupNow}</button><button onClick={async()=>{try{download((await request('api/backups/export')).data,'fossflow-backup.json');}catch(e:any){setMessage(e.message);}}}>{t.downloadBackup}</button><button disabled={!serverWritable} onClick={()=>backupInput.current?.click()}>{t.restoreBackup}</button></div><h3>{extra.storedBackups}</h3>{!archives.length && <p>{extra.backupEmpty}</p>}{archives.map(b=><div className="ha-row" key={b.name}><div><strong>{new Date(b.date).toLocaleString()}</strong><small>{Math.ceil(b.size/1024)} KB</small></div><button onClick={()=>archiveAction(b,'download')}>{extra.download}</button>{serverWritable && <><button onClick={()=>archiveAction(b,'restore')}>{extra.restoreDeleted}</button><button className="ha-danger" onClick={()=>archiveAction(b,'delete')}>{extra.purge}</button></>}</div>)}</>}
      {modal === 'trash' && <><p>{extra.trashHint} {config.trashDays}</p>{!trash.length && <p>{extra.trashEmpty}</p>}{trash.map(d=><div className="ha-row" key={d.id}><div><strong>{d.name}</strong><small>{new Date(d.deletedAt).toLocaleString()}</small></div>{serverWritable && <><button onClick={()=>archiveAction(d,'restore',true)}>{extra.restoreDeleted}</button><button className="ha-danger" onClick={()=>archiveAction(d,'delete',true)}>{extra.purge}</button></>}</div>)}</>}
      {modal === 'diagnostics' && <><p>{extra.diagnosticsHint}</p><button onClick={openDiagnostics}>{extra.refresh}</button>{diagnostics && <dl className="ha-diagnostics">{Object.entries(diagnostics).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>}</>}

      {modal === 'help' && <><p>{t.helpText}</p><p>FossFLOW / Isoflow · MIT · {config.version}</p></>}
    </section></div>}
  </div>;
}
