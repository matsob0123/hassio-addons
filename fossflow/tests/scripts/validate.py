#!/usr/bin/env python3
"""Validate release metadata, configuration parity, translations and vendored source."""
import hashlib, json, pathlib, re, subprocess, tarfile
import yaml
root = pathlib.Path(__file__).resolve().parents[2]
app = root
config = yaml.safe_load((app / 'config.yaml').read_text())
assert set(config['arch']) == {'amd64', 'aarch64'}
assert config['ingress'] and config['ingress_port'] == 8099 and config['apparmor']
assert config['ports'] == {'8080/tcp': None}
assert not any(config.get(k) for k in ['host_network','full_access','docker_api','hassio_api','homeassistant_api','privileged'])
assert config['backup'] == 'cold'
assert 'image' not in config, 'Local installation must build the Dockerfile'
assert config['init'] is True
for file in ['Dockerfile','run.sh','apparmor.txt','README.md','DOCS.md','CHANGELOG.md','icon.png','logo.png']:
    assert (app/file).is_file(), file
runtime_defaults = json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {defaults} from './runtime/config.mjs';console.log(JSON.stringify(defaults))"],cwd=root))
assert config['options'] == runtime_defaults, 'HA options differ from runtime defaults'
assert set(config['schema']) == set(runtime_defaults)
for lang in ['pl','en']:
    translation = yaml.safe_load((app/'translations'/f'{lang}.yaml').read_text())
    assert set(translation['configuration']) == set(runtime_defaults)
release = json.loads((app/'release.json').read_text())
assert release['version'] == config['version'] == json.loads((app/'package.json').read_text())['version']
assert release['version'] == json.loads((app/'package-lock.json').read_text())['packages']['']['version']
assert f"ARG NODE_IMAGE={release['base_image']}" in (app/'Dockerfile').read_text()
assert f"ARG BUILD_VERSION={release['version']}" in (app/'Dockerfile').read_text()
assert re.fullmatch(r'node:\d+-alpine\d+\.\d+@sha256:[a-f0-9]{64}',release['base_image'])
for source in [*(app/'runtime').glob('*.mjs'),*(app/'automation').glob('*.mjs')]:
    subprocess.run(['node','--check',str(source)],check=True)
archive = app/'vendor/fossflow.tar.gz'
expected = 'c180962e256127a00ad51d65f0ab41fa984f1d3d320d2258d964ddd3e9f0111c'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == expected
assert expected in (app/'Dockerfile').read_text()
with tarfile.open(archive) as tar:
    assert 'LICENSE' in tar.getnames()
    assert 'package-lock.json' in tar.getnames()
    assert not any(n.startswith('/') or '..' in pathlib.PurePosixPath(n).parts for n in tar.getnames())
assert json.loads((root.parent/'repository.json').read_text())['name']
for workflow in (root.parent/'.github/workflows').glob('*.yaml'):
    yaml.safe_load(workflow.read_text())
print(f'PASS: metadata, {len(runtime_defaults)} options/schema/translations, runtime syntax, archive SHA-256, repository and workflows')
