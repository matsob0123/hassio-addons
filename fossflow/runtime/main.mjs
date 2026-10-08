import { loadConfig, makeLogger, applyEnvironment } from './config.mjs';
import { Store } from './store.mjs';
import { createServers } from './server.mjs';

let store, servers, stopping = false;
try {
  process.umask(0o077);
  const config = await loadConfig(); applyEnvironment(config.options.custom_env); const log = makeLogger(config.options.log_level);
  store = new Store(config,log); await store.init();
  servers = await createServers(config,store,log); await servers.start();
  log('info',`FossFLOW ${config.version}; Ingress :${config.ingressPort}; storage ${config.options.storage_enabled ? 'enabled' : 'disabled'}; read-only ${config.options.read_only}`);
  if(config.options.direct_access) log('info',`Authenticated direct access :${config.directPort} (${config.options.direct_ssl ? 'HTTPS' : 'HTTP'})`);
  const stop = async () => {
    if(stopping) return; stopping = true; log('info','Stopping FossFLOW');
    store.close(); await servers.close(); await store.queue;
    if(config.options.backup_on_shutdown && config.options.storage_enabled && !config.options.read_only) {
      await store.backup({scheduled:true}).catch(e=>{log('error',`Shutdown backup failed: ${e.message}`);process.exitCode=1;});
    }
  };
  process.on('SIGTERM',()=>stop().catch(e=>{console.error(e.message);process.exitCode=1;}));
  process.on('SIGINT',()=>stop().catch(e=>{console.error(e.message);process.exitCode=1;}));
} catch(e) {
  store?.close(); await servers?.close();
  console.error(`FossFLOW startup failed: ${e.message}`); process.exitCode = 1;
}
