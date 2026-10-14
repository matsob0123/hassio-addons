import ast,json,re,sys
from pathlib import Path
import yaml
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'runtime'))
from config import DEFAULTS,validate_options
c=yaml.safe_load((ROOT/'config.yaml').read_text());r=json.loads((ROOT/'release.json').read_text());d=(ROOT/'Dockerfile').read_text()
assert c['version']==r['version'] and c['slug']=='squid_proxy'
assert c['options']==DEFAULTS and set(c['schema'])==set(DEFAULTS)
validate_options(DEFAULTS,require_credentials=False)
assert c['apparmor'] and c['ingress'] and c['init'] and c['panel_admin']
assert c['arch']==['amd64','aarch64'] and c['backup']=='cold'
assert not any(c.get(k) for k in ['host_network','host_pid','host_dbus','full_access','privileged','hassio_api','homeassistant_api','docker_api'])
assert c['map']==[{'type':'ssl','read_only':True}]
assert c['ports']=={'3128/tcp':3128,'3129/tcp':None}
assert 'ARG BASE_IMAGE='+r['base_image'] in d and 'ARG SQUID_VERSION='+r['squid_version'] in d and 'ARG SQUID_SHA256='+r['squid_sha256'] in d
for lang in ['pl','en']:
 t=yaml.safe_load((ROOT/'translations'/f'{lang}.yaml').read_text());assert set(t['configuration'])==set(DEFAULTS)
for p in (ROOT/'runtime').glob('*.py'):ast.parse(p.read_text(),str(p))
for p in (ROOT/'tests').glob('*.py'):ast.parse(p.read_text(),str(p))
for p in ['README.md','DOCS.md','LICENSE','NOTICE','CHANGELOG.md','apparmor.txt','icon.png','logo.png']:assert (ROOT/p).is_file(),p
for p in (ROOT/'web').glob('*'):
 text=p.read_text();assert 'cdn.jsdelivr' not in text and 'fonts.googleapis' not in text
print(f'PASS: metadata, {len(DEFAULTS)} typed options + translations, least privilege and source pins')
