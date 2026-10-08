import fs from 'node:fs/promises';
import path from 'node:path';

export const defaults = Object.freeze({
  log_level: 'info', access_log: false, storage_enabled: true, read_only: false,
  max_diagram_size_mb: 20, max_diagrams: 500, revisions_keep: 20,
  backup_interval_hours: 24, backup_keep: 7, backup_to_share: false,
  autosave_seconds: 5, language: 'pl', theme: 'system',
  default_diagram_name: 'Moja sieć', direct_access: false,
  direct_username: 'fossflow', direct_password: '', direct_session_hours: 12,
  direct_ssl: false, certfile: 'fullchain.pem', keyfile: 'privkey.pem',
  compression_enabled: true, trash_keep_days: 30, trash_max: 100,
  backup_on_start: true, backup_max_size_mb: 100,
  startup_diagram: 'new', diagram_sort: 'modified', browser_drafts: true,
  editor_grid: true, external_icons: true
});

export function validateOptions(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Options must be an object');
  for (const key of Object.keys(input)) if (!Object.hasOwn(defaults,key)) throw new Error(`Unknown option: ${key}`);
  const o = { ...defaults, ...input };
  for (const key of ['access_log','storage_enabled','read_only','backup_to_share','direct_access','direct_ssl','compression_enabled','backup_on_start','browser_drafts','editor_grid','external_icons']) {
    if (typeof o[key] !== 'boolean') throw new Error(`${key} must be boolean`);
  }
  const ranges = { max_diagram_size_mb:[1,100], max_diagrams:[1,5000], revisions_keep:[0,100], backup_interval_hours:[0,168], backup_keep:[1,90], autosave_seconds:[0,300], direct_session_hours:[1,168], trash_keep_days:[0,365], trash_max:[1,1000], backup_max_size_mb:[1,100] };
  for (const [key, [min,max]] of Object.entries(ranges)) {
    if (!Number.isInteger(o[key]) || o[key] < min || o[key] > max) throw new Error(`${key} must be ${min}..${max}`);
  }
  for (const [key, values] of Object.entries({ log_level:['debug','info','warning','error'], language:['pl','en'], theme:['system','light','dark'], startup_diagram:['new','latest'], diagram_sort:['modified','name','created'] })) {
    if (!values.includes(o[key])) throw new Error(`Invalid ${key}`);
  }
  for (const key of ['default_diagram_name','direct_username','direct_password','certfile','keyfile']) {
    if (typeof o[key] !== 'string' || o[key].length > 1024) throw new Error(`Invalid ${key}`);
  }
  if (!o.default_diagram_name.trim() || o.default_diagram_name.length > 100) throw new Error('Diagram name must have 1..100 characters');
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(o.direct_username)) throw new Error('Invalid direct_username');
  for (const key of ['certfile','keyfile']) if (!/^[A-Za-z0-9_.-]{1,128}$/.test(o[key]) || o[key].includes('..')) throw new Error(`Invalid ${key}`);
  if (o.direct_access && o.direct_password.length < 12) throw new Error('direct_password must have at least 12 characters when direct_access is enabled');
  return o;
}

export async function loadConfig(env = process.env) {
  const dataDir = path.resolve(env.FOSSFLOW_DATA_DIR || '/data');
  let options = {};
  try { options = JSON.parse(await fs.readFile(env.FOSSFLOW_OPTIONS_FILE || path.join(dataDir,'options.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return {
    options: validateOptions(options), dataDir,
    staticDir: path.resolve(env.FOSSFLOW_STATIC_DIR || '/app/public'),
    shareDir: path.resolve(env.FOSSFLOW_SHARE_DIR || '/share/fossflow-backups'),
    sslDir: path.resolve(env.FOSSFLOW_SSL_DIR || '/ssl'),
    ingressHost: env.FOSSFLOW_INGRESS_HOST || '0.0.0.0',
    ingressPort: Number(env.FOSSFLOW_INGRESS_PORT || 8099),
    directHost: env.FOSSFLOW_DIRECT_HOST || '0.0.0.0',
    directPort: Number(env.FOSSFLOW_DIRECT_PORT || 8080),
    // Loopback is explicitly added ONLY by local tests, never through app options.
    ingressPeers: (env.FOSSFLOW_INGRESS_PEERS || '172.30.32.2').split(','),
    version: env.BUILD_VERSION || '1.1.0'
  };
}

export function makeLogger(level = 'info') {
  const ranks = {debug:0, info:1, warning:2, error:3};
  return (severity, message) => {
    if (ranks[severity] >= ranks[level]) console.log(`${new Date().toISOString()} [${severity.toUpperCase()}] ${message}`);
  };
}
