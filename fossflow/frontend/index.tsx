import React from 'react';
import ReactDOM from 'react-dom/client';
import 'fossflow/dist/styles.css';
import 'react-quill/dist/quill.snow.css';
import App from './App';
import { ErrorBoundary } from 'react-error-boundary';

function Fallback({error}:any){return <div style={{padding:24,fontFamily:'system-ui'}}><h1>FossFLOW</h1><p>Nie udało się otworzyć edytora / Could not open editor</p><pre style={{whiteSpace:'pre-wrap'}}>{error.message}</pre><button onClick={()=>location.reload()}>Odśwież / Reload</button></div>;}
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<ErrorBoundary FallbackComponent={Fallback}><App/></ErrorBoundary>);
// Intentionally no global service worker: HA authenticates Ingress and its URL may rotate.
