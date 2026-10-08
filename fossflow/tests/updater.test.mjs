import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {hash,FILES,policyOptions,isDue,patchVersion,inspectManifest,registryImage,makeCandidate,validateCandidate,applyCandidate,publishCandidate} from '../automation/update.mjs';
const exec=promisify(execFile);
const policy={enabled:true,interval_days:14,repository:'library/node',tag:'22-alpine3.22',platforms:['amd64','arm64'],github_releases:true};
const digest='sha256:'+'a'.repeat(64),image={digest,children:{amd64:'sha256:'+'b'.repeat(64),arm64:'sha256:'+'c'.repeat(64)}};
const now=new Date('2026-10-22T03:17:00Z');
const root=path.resolve(import.meta.dirname,'../..');
async function fixture(t) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'fossflow-update-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  for(const name of [...FILES,'.github/fossflow-updates.json']) {await fs.mkdir(path.dirname(path.join(dir,name)),{recursive:true});await fs.copyFile(path.join(root,name),path.join(dir,name));}
  return dir;
}
function index() {return Buffer.from(JSON.stringify({schemaVersion:2,mediaType:'application/vnd.oci.image.index.v1+json',manifests:['amd64','arm64'].map((architecture,i)=>({platform:{os:'linux',architecture},digest:'sha256:'+String(i+1).repeat(64),size:100}))}));}
test('14-day interval survives month, year and leap-day boundaries; force and disable',()=>{
  for(const date of ['2026-01-25','2026-12-25','2028-02-25']) {
    const start=new Date(date),state={last_checked_at:start.toISOString(),last_digest:digest};
    assert.equal(isDue(state,policy,new Date(+start+14*86400000-1)),false);
    assert.equal(isDue(state,policy,new Date(+start+14*86400000)),true);
    assert.equal(isDue(state,policy,start,true),true);
    assert.equal(isDue(state,{...policy,enabled:false},new Date(+start+100*86400000),true),false);
  }
  assert.throws(()=>isDue({last_checked_at:'bad',last_digest:digest},policy,now),/date/);
  assert.throws(()=>isDue({last_checked_at:'2027-01-01',last_digest:digest},policy,now),/date/);
});
test('policy rejects untrusted registries, floating tags, unsupported platforms and intervals',()=>{
  assert.equal(policyOptions(policy),policy);
  for(const patch of [{repository:'evil/node'},{tag:'latest'},{tag:'22-alpine3.22\nRUN bad'},{interval_days:0},{platforms:['amd64']}]) assert.throws(()=>policyOptions({...policy,...patch}),/policy/);
  assert.equal(patchVersion('1.2.9'),'1.2.10');assert.throws(()=>patchVersion('1.2.3-beta'),/semantic/);
});
test('manifest bytes and advertised digest match, both actual platforms required',()=>{
  const bytes=index(),d='sha256:'+hash(bytes);
  assert.equal(inspectManifest(bytes,d).digest,d);
  assert.throws(()=>inspectManifest(bytes,digest),/digest/);
  const m=JSON.parse(bytes);m.manifests.pop();const b=Buffer.from(JSON.stringify(m));assert.throws(()=>inspectManifest(b,'sha256:'+hash(b)),/arm64/);
  m.manifests.push(m.manifests[0]);const duplicate=Buffer.from(JSON.stringify(m));assert.throws(()=>inspectManifest(duplicate,'sha256:'+hash(duplicate)),/ambiguous/);
  const single=Buffer.from('{"schemaVersion":2}');assert.throws(()=>inspectManifest(single,'sha256:'+hash(single)),/index/);
});
test('Docker Hub authentication and Accept headers, no credentials to other URLs',async()=>{
  let calls=0;const bytes=index();
  const fake=async(url,options)=>{
    assert.equal(options.redirect,'error');calls++;
    if(calls===1) {assert.match(url,/^https:\/\/auth\.docker\.io\/token\?/);return Response.json({token:'ephemeral-test-value'});}
    assert.equal(url,'https://registry-1.docker.io/v2/library/node/manifests/22-alpine3.22');assert.equal(options.headers.Authorization,'Bearer ephemeral-test-value');assert.match(options.headers.Accept,/image.index/);
    return new Response(bytes,{headers:{'Docker-Content-Digest':'sha256:'+hash(bytes)}});
  };
  assert.equal((await registryImage(policy,fake)).digest,'sha256:'+hash(bytes));assert.equal(calls,2);
});
test('registry failures retry transient errors, fail closed on 404 and malformed token',async()=>{
  let calls=0;await assert.rejects(registryImage(policy,async()=>{calls++;return new Response('',{status:503});}),/503/);assert.equal(calls,3);
  calls=0;await assert.rejects(registryImage(policy,async()=>{calls++;return new Response('',{status:404});}),/404/);assert.equal(calls,1);
  await assert.rejects(registryImage(policy,async()=>Response.json({})),/token/);
});
test('changed digest increments patch and updates all version/pin files, preserving options',async t=>{
  const dir=await fixture(t),c=await makeCandidate(dir,image,now);assert.equal(c.changed,true);
  const old=JSON.parse(await fs.readFile(path.join(dir,'fossflow/release.json')));assert.equal(c.version,patchVersion(old.version));
  await validateCandidate(dir,c);await applyCandidate(dir,c);
  assert.match(await fs.readFile(path.join(dir,'fossflow/Dockerfile'),'utf8'),new RegExp('NODE_IMAGE=node:22-alpine3.22@'+digest));
  const before=await fs.readFile(path.join(root,'fossflow/config.yaml'),'utf8'),after=await fs.readFile(path.join(dir,'fossflow/config.yaml'),'utf8');assert.equal(before.replace(/^version: .+$/m,''),after.replace(/^version: .+$/m,''));
  assert.equal(JSON.parse(await fs.readFile(path.join(dir,'fossflow/package-lock.json'))).packages[''].version,c.version);
  assert.match(await fs.readFile(path.join(dir,'fossflow/CHANGELOG.md'),'utf8'),/Automated rebuild/);
});
test('unchanged image updates check state only; no fake release or addon bump',async t=>{
  const dir=await fixture(t),release=JSON.parse(await fs.readFile(path.join(dir,'fossflow/release.json')));
  const c=await makeCandidate(dir,{...image,digest:release.base_image.split('@')[1]},now);
  assert.equal(c.changed,false);assert.equal(c.version,release.version);assert.deepEqual(c.files.map(f=>f.name),FILES.slice(0,1));await applyCandidate(dir,c);
});
test('candidate rejects injected code, altered options, missing/extra/duplicate paths and hash spoofing',async t=>{
  const dir=await fixture(t),c=await makeCandidate(dir,image,now);
  for(const mutate of [x=>x.files.push({name:'../escape',content:'oops'}),x=>x.files.pop(),x=>x.files.push(x.files[0]),x=>{x.files[3].content+='\nRUN evil\n';x.files[3].newHash=hash(x.files[3].content);},x=>x.files[0].oldHash='f'.repeat(64),x=>x.version='9.9.9']) {
    const bad=structuredClone(c);mutate(bad);await assert.rejects(validateCandidate(dir,bad));
  }
  assert.equal(await fs.readFile(path.join(dir,'fossflow/Dockerfile'),'utf8'),await fs.readFile(path.join(root,'fossflow/Dockerfile'),'utf8'));
});
test('candidate conflicts and symlinks fail before any file writes',async t=>{
  const dir=await fixture(t),c=await makeCandidate(dir,image,now),state=await fs.readFile(path.join(dir,FILES[0]),'utf8');
  await fs.appendFile(path.join(dir,'fossflow/config.yaml'),'# concurrent change\n');await assert.rejects(applyCandidate(dir,c));assert.equal(await fs.readFile(path.join(dir,FILES[0]),'utf8'),state);
  await fs.copyFile(path.join(root,'fossflow/config.yaml'),path.join(dir,'fossflow/config.yaml'));await fs.rename(path.join(dir,FILES[3]),path.join(dir,'docker.txt'));await fs.symlink('../docker.txt',path.join(dir,FILES[3]));await assert.rejects(applyCandidate(dir,c),/conflicts/);assert.equal(await fs.readFile(path.join(dir,FILES[0]),'utf8'),state);
});
test('metadata drift is rejected instead of silently rewriting an inconsistent release',async t=>{
  const dir=await fixture(t);await fs.appendFile(path.join(dir,'fossflow/Dockerfile'),'\n');
  const p=JSON.parse(await fs.readFile(path.join(dir,'fossflow/package.json')));p.version='99.0.0';await fs.writeFile(path.join(dir,'fossflow/package.json'),JSON.stringify(p));await assert.rejects(makeCandidate(dir,image,now),/package version/);
});
async function gitFixture(t) {
  const dir=await fixture(t),remote=await fs.mkdtemp(path.join(os.tmpdir(),'fossflow-remote-'));t.after(()=>fs.rm(remote,{recursive:true,force:true}));
  const git=async(...args)=>(await exec('git',args,{cwd:dir})).stdout.trim();
  await exec('git',['init','--bare',remote]);await git('init','-b','main');await git('config','user.name','Test');await git('config','user.email','test@example.invalid');await git('add','.');await git('commit','-m','base');await git('remote','add','origin',remote);await git('push','origin','main');return {dir,remote,git,base:await git('rev-parse','HEAD')};
}
test('real atomic git publication creates matching main/tag, no-change check has no tag',async t=>{
  const {dir,remote,git,base}=await gitFixture(t),c=await makeCandidate(dir,image,now),result=await publishCandidate(dir,c,base,{releases:false});
  assert.equal(result.tag,'fossflow-v'+c.version);assert.equal((await exec('git',['rev-parse','refs/heads/main'],{cwd:remote})).stdout.trim(),result.commit);assert.equal(await git('rev-parse',`${result.tag}^{commit}`),result.commit);
  const next=await makeCandidate(dir,image,new Date(+now+14*86400000));assert.equal(next.changed,false);const checked=await publishCandidate(dir,next,result.commit,{releases:false});assert.equal(checked.tag,null);assert.equal((await git('tag')).split('\n').length,1);
});
test('real git publication refuses advanced main, dirty base and existing tag',async t=>{
  const {dir,git,base}=await gitFixture(t),c=await makeCandidate(dir,image,now);
  await fs.appendFile(path.join(dir,'fossflow/config.yaml'),'# dirty\n');await assert.rejects(publishCandidate(dir,c,base,{releases:false}),/clean/);await git('checkout','--','fossflow/config.yaml');
  await git('tag','fossflow-v'+c.version);await git('push','origin','--tags');await assert.rejects(publishCandidate(dir,c,base,{releases:false}),/tag already/);await git('push','origin',':refs/tags/fossflow-v'+c.version);
  await git('commit','--allow-empty','-m','concurrent');await git('push','origin','main');await git('reset','--hard',base);await assert.rejects(publishCandidate(dir,c,base,{releases:false}),/Main advanced/);assert.equal(await git('rev-parse','HEAD'),base);
});

test('GitHub Release request follows atomic publication; API failure preserves published tag and reports partial success',async t=>{
  const {dir,git,base}=await gitFixture(t),saved={token:process.env.GITHUB_TOKEN,repo:process.env.GITHUB_REPOSITORY};
  process.env.GITHUB_TOKEN='ephemeral-test-value';process.env.GITHUB_REPOSITORY='example/test-repo';
  t.after(()=>{for(const [key,value] of [['GITHUB_TOKEN',saved.token],['GITHUB_REPOSITORY',saved.repo]]) {if(value===undefined) delete process.env[key];else process.env[key]=value;}});
  const c=await makeCandidate(dir,image,now);let calls=0;
  const result=await publishCandidate(dir,c,base,{fetchImpl:async(url,options)=>{
    calls++;assert.equal(url,'https://api.github.com/repos/example/test-repo/releases');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer ephemeral-test-value');
    const body=JSON.parse(options.body);assert.equal(body.tag_name,'fossflow-v'+c.version);assert.equal(body.prerelease,false);assert.equal(await git('rev-parse',`${body.tag_name}^{commit}`),await git('rev-parse','HEAD'));return Response.json({id:1},{status:201});
  }});assert.equal(calls,1);
  const next=await makeCandidate(dir,{...image,digest:'sha256:'+'d'.repeat(64)},new Date(+now+86400000));
  await assert.rejects(publishCandidate(dir,next,result.commit,{fetchImpl:async()=>new Response('',{status:403})}),/Commit\/tag published; GitHub release failed with HTTP 403/);
  assert.equal(await git('rev-parse',`fossflow-v${next.version}^{commit}`),await git('rev-parse','HEAD'));
});
