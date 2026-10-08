#!/usr/bin/env node
// No registry SDK, shell interpolation, PAT, floating base or unattended major upgrade.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const exec=promisify(execFile);
export const hash = value => createHash('sha256').update(value).digest('hex');
export const FILES=Object.freeze(['.github/fossflow-update-state.json','fossflow/release.json','fossflow/config.yaml','fossflow/Dockerfile','fossflow/package.json','fossflow/package-lock.json','fossflow/CHANGELOG.md']);
const digestPattern=/^sha256:[a-f0-9]{64}$/;
export function policyOptions(p) {
  if(typeof p.enabled !== 'boolean' || !Number.isInteger(p.interval_days) || p.interval_days < 1 || p.interval_days > 90 || p.repository !== 'library/node' || !/^\d+-alpine\d+\.\d+$/.test(p.tag) || JSON.stringify(p.platforms) !== '["amd64","arm64"]' || typeof p.github_releases !== 'boolean') throw new Error('Invalid updater policy');
  return p;
}
export function isDue(state,policy,now=new Date(),force=false) {
  const last=Date.parse(state.last_checked_at);
  if(!Number.isFinite(now.getTime()) || !Number.isFinite(last) || last > now.getTime()) throw new Error('Invalid updater date');
  if(!digestPattern.test(state.last_digest)) throw new Error('Invalid updater digest');
  return policy.enabled && (force || now.getTime()-last >= policy.interval_days*86400000);
}
export function patchVersion(version) {
  if(!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected stable semantic version');
  const parts=version.split('.').map(Number);if(parts.some(n=>!Number.isSafeInteger(n)) || parts[2] >= Number.MAX_SAFE_INTEGER) throw new Error('Version too large');
  parts[2]++;return parts.join('.');
}
async function request(url,options,fetchImpl) {
  let error;
  for(let attempt=0;attempt<3;attempt++) {
    try {
      const response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
      if(response.ok) return response;
      error=new Error(`Registry HTTP ${response.status}`);
      if(response.status !== 429 && response.status < 500) throw error;
    } catch(e) {error=e;if(e.message.startsWith('Registry HTTP ') && !/HTTP (429|5\d\d)$/.test(e.message)) throw e;}
    if(attempt < 2) await new Promise(resolve=>setTimeout(resolve,(attempt+1)*250));
  }
  throw error;
}
export function inspectManifest(bytes,headerDigest,platforms=['amd64','arm64']) {
  const digest=`sha256:${hash(bytes)}`;
  if(!digestPattern.test(headerDigest || '') || headerDigest !== digest) throw new Error('Registry manifest digest does not match bytes');
  const manifest=JSON.parse(bytes.toString('utf8'));
  if(manifest.schemaVersion !== 2 || !['application/vnd.oci.image.index.v1+json','application/vnd.docker.distribution.manifest.list.v2+json'].includes(manifest.mediaType) || !Array.isArray(manifest.manifests)) throw new Error('Expected a multi-architecture image index');
  const children={};
  for(const architecture of platforms) {
    const found=manifest.manifests.filter(m=>m.platform?.os === 'linux' && m.platform.architecture === architecture);
    if(found.length !== 1 || !digestPattern.test(found[0].digest || '') || !Number.isSafeInteger(found[0].size) || found[0].size < 1) throw new Error(`Missing or ambiguous Linux ${architecture} manifest`);
    children[architecture]=found[0].digest;
  }
  return {digest,children};
}
export async function registryImage(policy,fetchImpl=fetch) {
  policyOptions(policy);
  const auth=await request(`https://auth.docker.io/token?service=registry.docker.io&scope=repository:${policy.repository}:pull`,{},fetchImpl);
  const token=(await auth.json()).token;
  if(typeof token !== 'string' || !token || token.length > 16384) throw new Error('Invalid registry token');
  const response=await request(`https://registry-1.docker.io/v2/${policy.repository}/manifests/${policy.tag}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json'}},fetchImpl);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length > 2*1024*1024) throw new Error('Image manifest too large');
  return inspectManifest(bytes,response.headers.get('docker-content-digest'),policy.platforms);
}
const json=value=>JSON.stringify(value,null,2)+'\n';
export async function makeCandidate(root,image,now=new Date()) {
  if(!digestPattern.test(image.digest)) throw new Error('Invalid candidate image digest');
  const policy=policyOptions(JSON.parse(await fs.readFile(path.join(root,'.github/fossflow-updates.json'),'utf8')));
  const old={};for(const name of FILES) old[name]=await fs.readFile(path.join(root,name),'utf8');
  const release=JSON.parse(old['fossflow/release.json']);
  const expected=`node:${policy.tag}@`;
  if(!release.base_image.startsWith(expected) || !digestPattern.test(release.base_image.slice(expected.length))) throw new Error('Policy and release base image differ');
  const docker=old['fossflow/Dockerfile'];
  if(docker.match(/^ARG NODE_IMAGE=(.+)$/m)?.[1] !== release.base_image || docker.match(/^ARG BUILD_VERSION=(.+)$/m)?.[1] !== release.version || old['fossflow/config.yaml'].match(/^version: (.+)$/m)?.[1] !== release.version) throw new Error('Inconsistent Docker/config/release metadata');
  for(const name of ['fossflow/package.json','fossflow/package-lock.json']) {
    const p=JSON.parse(old[name]);if(p.version !== release.version || (p.packages && p.packages[''].version !== release.version)) throw new Error('Inconsistent package version');
  }
  const changed=release.base_image !== expected+image.digest;
  const version=changed ? patchVersion(release.version) : release.version;
  const updated={'.github/fossflow-update-state.json':json({last_checked_at:now.toISOString(),last_digest:image.digest})};
  if(changed) {
    updated['fossflow/release.json']=json({...release,version,base_image:expected+image.digest});
    updated['fossflow/config.yaml']=old['fossflow/config.yaml'].replace(/^version: .+$/m,`version: ${version}`);
    updated['fossflow/Dockerfile']=docker.replace(/^ARG NODE_IMAGE=.+$/m,`ARG NODE_IMAGE=${expected+image.digest}`).replace(/^ARG BUILD_VERSION=.+$/m,`ARG BUILD_VERSION=${version}`);
    for(const name of ['fossflow/package.json','fossflow/package-lock.json']) {
      const p=JSON.parse(old[name]);p.version=version;if(p.packages) p.packages[''].version=version;updated[name]=json(p);
    }
    updated['fossflow/CHANGELOG.md']=old['fossflow/CHANGELOG.md'].replace('# Changelog\n',`# Changelog\n\n## ${version} — ${now.toISOString().slice(0,10)}\n\n- Automated rebuild: \`${expected+image.digest}\`.\n- Linux amd64/arm64 manifests verified; runtime, browser and both Docker images tested before publication.\n`);
  }
  return {format:1,changed,version,image,checkedAt:now.toISOString(),files:Object.entries(updated).map(([name,content])=>({name,oldHash:hash(old[name]),content,newHash:hash(content)}))};
}
export async function validateCandidate(root,candidate) {
  if(candidate?.format !== 1 || typeof candidate.changed !== 'boolean' || !/^\d+\.\d+\.\d+$/.test(candidate.version || '') || !digestPattern.test(candidate.image?.digest || '') || !Number.isFinite(Date.parse(candidate.checkedAt)) || !Array.isArray(candidate.files)) throw new Error('Invalid update candidate');
  const required=candidate.changed ? FILES : FILES.slice(0,1);
  if(JSON.stringify(candidate.files.map(f=>f.name).sort()) !== JSON.stringify([...required].sort())) throw new Error('Candidate has unexpected, missing or duplicate paths');
  // Regenerate all contents with trusted code. An artifact cannot inject source,
  // change options, remove data or substitute arbitrary Docker instructions.
  const expected=await makeCandidate(root,candidate.image,new Date(candidate.checkedAt));
  if(JSON.stringify(expected) !== JSON.stringify(candidate)) throw new Error('Candidate content differs from deterministic plan');
  for(const file of candidate.files) {
    const full=path.join(root,file.name),stat=await fs.lstat(full);
    if(!stat.isFile() || stat.isSymbolicLink() || hash(await fs.readFile(full)) !== file.oldHash || hash(file.content) !== file.newHash) throw new Error('Candidate conflicts with repository files');
  }
}
export async function applyCandidate(root,candidate) {
  await validateCandidate(root,candidate);
  for(const file of candidate.files) await fs.writeFile(path.join(root,file.name),file.content);
}
export async function publishCandidate(root,candidate,baseSha,{releases=true,fetchImpl=fetch}={}) {
  if(!/^[a-f0-9]{40}$/.test(baseSha || '')) throw new Error('Invalid base SHA');
  const git=async(...args)=>(await exec('git',args,{cwd:root})).stdout.trim();
  if(await git('rev-parse','HEAD') !== baseSha || await git('status','--porcelain','--untracked-files=no')) throw new Error('Publication requires the clean tested base');
  if((await git('ls-remote','origin','refs/heads/main')).split(/\s/)[0] !== baseSha) throw new Error('Main advanced; retry against the new base without force pushing');
  const tag=`fossflow-v${candidate.version}`;
  if(candidate.changed && await git('ls-remote','origin',`refs/tags/${tag}`)) throw new Error('Release tag already exists');
  await applyCandidate(root,candidate);
  await git('config','user.name','github-actions[bot]');await git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');
  await git('add','--',...candidate.files.map(f=>f.name));
  await git('commit','-m',candidate.changed ? `FossFLOW ${candidate.version}: update pinned Node base` : 'Record fortnightly FossFLOW base image check');
  if(candidate.changed) await git('tag','-a',tag,'-m',`FossFLOW ${candidate.version}`);
  // Atomic, ordinary fast-forward push. Branch protection remains authoritative.
  await git('push','--atomic','origin','HEAD:refs/heads/main',...(candidate.changed ? [`refs/tags/${tag}`] : []));
  if(candidate.changed && releases) {
    const repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
    if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '') || !token) throw new Error('Commit/tag published, but GitHub release needs repository and token');
    const response=await fetchImpl(`https://api.github.com/repos/${repository}/releases`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,name:`FossFLOW ${candidate.version}`,body:`Base image: \`${candidate.image.digest}\`\n\nValidated runtime/API, frontend, Ingress browser scenarios and Docker amd64/aarch64 before publication.\n\nUpdate from Home Assistant's app store; installations are never restarted by this workflow.`,draft:false,prerelease:false})});
    if(!response.ok) throw new Error(`Commit/tag published; GitHub release failed with HTTP ${response.status}. Create the release from the existing tag.`);
  }
  return {tag:candidate.changed ? tag : null,commit:await git('rev-parse','HEAD')};
}
async function cli() {
  const args=process.argv.slice(2);const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
  const value=name=>{const i=args.indexOf(name);return i < 0 ? null : args[i+1];};
  if(args.some((x,i)=>x.startsWith('--') && !['--force','--ci','--plan','--apply','--publish','--base'].includes(x))) throw new Error('Unknown argument');
  const policy=policyOptions(JSON.parse(await fs.readFile(path.join(root,'.github/fossflow-updates.json'),'utf8')));
  if(value('--apply') || value('--publish')) {
    const candidate=JSON.parse(await fs.readFile(value('--apply') || value('--publish'),'utf8'));
    if(value('--publish')) console.log(JSON.stringify(await publishCandidate(root,candidate,value('--base'),{releases:policy.github_releases})));
    else await applyCandidate(root,candidate);
    return;
  }
  const state=JSON.parse(await fs.readFile(path.join(root,'.github/fossflow-update-state.json'),'utf8'));
  const due=args.includes('--ci') || isDue(state,policy,new Date(),args.includes('--force'));
  let candidate;
  if(due) {const image=await registryImage(policy);candidate=await makeCandidate(root,image);if(value('--plan')) await fs.writeFile(value('--plan'),json(candidate));}
  const output={due,changed:candidate?.changed || false,version:candidate?.version || '',digest:candidate?.image.digest || '',checked_at:candidate?.checkedAt || ''};
  console.log(JSON.stringify(output,null,2));
  if(process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT,Object.entries(output).map(([k,v])=>`${k}=${v}`).join('\n')+'\n');
  if(process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,`### FossFLOW image check\n\nDue: **${due}** · base changed: **${output.changed}** · candidate: **${output.version || 'none'}**\n\nDigest: \`${output.digest || 'not queried'}\`\n\nNo repository writes happen during this check. Publication requires successful validation.\n`);
}
if(process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli().catch(e=>{console.error(`FossFLOW updater failed: ${e.message}`);process.exitCode=1;});
