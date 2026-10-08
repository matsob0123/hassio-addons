import fs from 'node:fs/promises';
import path from 'node:path';
const release = JSON.parse(await fs.readFile(new URL('../release.json',import.meta.url),'utf8'));

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
  editor_grid: true, external_icons: true,
  custom_env: [], backup_skip_empty: true, backup_keep_days: 0, backup_share_keep: 7,
  backup_on_shutdown: false, backup_deduplicate: false, revisions_max_age_days: 0,
  min_free_space_mb: 16, compression_min_bytes: 1024, compression_level: 6,
  request_timeout_seconds: 120, direct_max_sessions: 100,
  direct_login_attempts: 5, direct_lockout_minutes: 15
});

export function validateOptions(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Options must be an object');
  for (const key of Object.keys(input)) if (!Object.hasOwn(defaults,key)) throw new Error(`Unknown option: ${key}`);
  const o = { ...defaults, ...input };
  for (const key of ['access_log','storage_enabled','read_only','backup_to_share','direct_access','direct_ssl','compression_enabled','backup_on_start','browser_drafts','editor_grid','external_icons','backup_skip_empty','backup_on_shutdown','backup_deduplicate']) {
    if (typeof o[key] !== 'boolean') throw new Error(`${key} must be boolean`);
  }
  const ranges = { max_diagram_size_mb:[1,100], max_diagrams:[1,5000], revisions_keep:[0,100], backup_interval_hours:[0,168], backup_keep:[1,90], autosave_seconds:[0,300], direct_session_hours:[1,168], trash_keep_days:[0,365], trash_max:[1,1000], backup_max_size_mb:[1,100], backup_keep_days:[0,3650], backup_share_keep:[1,90], revisions_max_age_days:[0,3650], min_free_space_mb:[0,10240], compression_min_bytes:[256,1048576], compression_level:[1,9], request_timeout_seconds:[15,600], direct_max_sessions:[1,1000], direct_login_attempts:[1,20], direct_lockout_minutes:[1,1440] };
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
  o.custom_env = validateEnvironment(o.custom_env);
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
    version: env.BUILD_VERSION || release.version
  };
}

export function makeLogger(level = 'info') {
  const ranks = {debug:0, info:1, warning:2, error:3};
  return (severity, message) => {
    if (ranks[severity] >= ranks[level]) console.log(`${new Date().toISOString()} [${severity.toUpperCase()}] ${message}`);
  };
}

// Apply within the existing Node process, never a shell or a second interpreter.
// Runtime/library startup switches and trust boundaries cannot be changed by options.
export function validateEnvironment(entries) {
  if (!Array.isArray(entries) || entries.length > 64) throw new Error('custom_env must contain at most 64 entries');
  const seen = new Set(); let total = 0;
  return entries.map(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).sort().join(',') !== 'name,value') throw new Error('custom_env entries require name and value');
    const {name,value} = entry;
    if (typeof name !== 'string' || !/^[A-Z][A-Z0-9_]{0,63}$/.test(name)) throw new Error('Invalid custom_env name');
    if (/^(FOSSFLOW_|NODE_|LD_|DYLD_|SUPERVISOR_|HASSIO_|BASH_|PYTHON|GITHUB_|ACTIONS_)/.test(name) || ['PATH','HOME','PWD','SHELL','ENV','BASH_ENV','IFS','NODE_OPTIONS','BUILD_VERSION','SSL_CERT_FILE','SSL_CERT_DIR','OPENSSL_CONF','OPENSSL_MODULES','UV_THREADPOOL_SIZE'].includes(name)) throw new Error(`Reserved custom_env name: ${name}`);
    if (seen.has(name)) throw new Error(`Duplicate custom_env name: ${name}`);
    if (typeof value !== 'string' || value.includes('\0') || Buffer.byteLength(value) > 8192) throw new Error('Invalid custom_env value');
    total += Buffer.byteLength(name) + Buffer.byteLength(value);
    if (total > 65536) throw new Error('custom_env exceeds 64 KiB');
    if (name === 'TZ') {
      try { new Intl.DateTimeFormat('en', {timeZone:value}).format(); } catch { throw new Error('Invalid TZ: use an IANA timezone'); }
    }
    seen.add(name); return {name,value};
  });
}
export function applyEnvironment(entries, env = process.env) {
  for (const {name,value} of validateEnvironment(entries)) env[name] = value;
}
