"""Typed HA options -> bounded Squid configuration. No raw directives or shell evaluation."""
import copy
import ipaddress
import json
import os
import re
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULTS = {
    'enable_http': True, 'enable_https': False, 'auth_enabled': True,
    'proxy_user': 'squidadmin', 'proxy_password': '', 'additional_users': [],
    'allowed_networks': ['192.168.0.0/16'], 'denied_networks': [],
    'allow_public_clients': False, 'allow_private_destinations': False,
    'allowed_domains': [], 'blocked_domains': [], 'dns_servers': [],
    'http_safe_ports': [80, 443], 'https_connect_ports': [443],
    'cache_mode': 'off', 'cache_mem_mb': 64, 'cache_disk_mb': 512,
    'cache_max_object_mb': 16, 'cache_object_memory_kb': 512,
    'max_connections_per_client': 64, 'request_body_max_mb': 50,
    'connect_timeout_seconds': 15, 'request_timeout_seconds': 60,
    'read_timeout_seconds': 120, 'client_lifetime_minutes': 60,
    'shutdown_timeout_seconds': 10, 'auth_cache_seconds': 60,
    'access_log': False, 'log_client_ips': False, 'log_level': 'info',
    'tls_mode': 'files', 'certfile': 'fullchain.pem', 'keyfile': 'privkey.pem',
    'tls_domain': 'proxy.home.arpa', 'language': 'pl', 'custom_env': []
}
RANGES = {
    'cache_mem_mb': (8, 1024), 'cache_disk_mb': (64, 32768),
    'cache_max_object_mb': (1, 1024), 'cache_object_memory_kb': (1, 16384),
    'max_connections_per_client': (1, 1024), 'request_body_max_mb': (1, 2048),
    'connect_timeout_seconds': (1, 120), 'request_timeout_seconds': (5, 600),
    'read_timeout_seconds': (5, 1800), 'client_lifetime_minutes': (1, 1440),
    'shutdown_timeout_seconds': (1, 20), 'auth_cache_seconds': (0, 3600)
}
PRIVATE_CLIENTS = [ipaddress.ip_network(n) for n in ('10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','100.64.0.0/10','fc00::/7','127.0.0.0/8','::1/128')]
# These remain blocked even when LAN destinations are explicitly enabled.
ALWAYS_BLOCKED = ['0.0.0.0/8','127.0.0.0/8','169.254.0.0/16','224.0.0.0/4','240.0.0.0/4',
                  '::/128','::1/128','fe80::/10','ff00::/8','172.30.32.0/23']
PRIVATE_DESTINATIONS = ['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','100.64.0.0/10','fc00::/7']
USERNAME = re.compile(r'^[A-Za-z0-9_.-]{1,64}$')

def string(value, name, maximum=253):
    if not isinstance(value, str) or len(value) > maximum or any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError(f'Invalid {name}')
    return value

def domains(values, name):
    if not isinstance(values, list) or len(values) > 500:
        raise ValueError(f'{name}: expected at most 500 domains')
    result = []
    for value in values:
        value = string(value, name).lower()
        if value.startswith('*.'): value = value[1:]
        suffix = value.startswith('.')
        host = value[1:] if suffix else value
        try: host = host.encode('idna').decode('ascii')
        except UnicodeError: raise ValueError(f'Invalid {name}') from None
        if len(host) > 253 or not re.fullmatch(r'(?!-)[a-z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-z0-9-]{1,63}(?<!-))*',host):
            raise ValueError(f'Invalid {name}: use domains, not URLs or directives')
        try: ipaddress.ip_address(host)
        except ValueError: pass
        else: raise ValueError(f'{name}: IP addresses are not domains')
        result.append(('.' if suffix else '')+host)
    return list(dict.fromkeys(result))

def environment(entries):
    if not isinstance(entries,list) or len(entries) > 32: raise ValueError('custom_env: maximum 32 entries')
    result=[]; seen=set(); total=0
    reserved={'PATH','HOME','PWD','SHELL','ENV','IFS','PYTHONPATH','PYTHONHOME','OPENSSL_CONF','OPENSSL_MODULES','SSL_CERT_FILE','SSL_CERT_DIR','SSLKEYLOGFILE','GCONV_PATH','LOCPATH','GLIBC_TUNABLES'}
    for e in entries:
        if not isinstance(e,dict) or set(e) != {'name','value'}: raise ValueError('custom_env requires name/value')
        n=e['name']; v=e['value']
        if not isinstance(n,str) or not re.fullmatch(r'[A-Z][A-Z0-9_]{0,63}',n): raise ValueError('Invalid custom_env name')
        if n in reserved or re.match(r'^(SQUID_|LD_|DYLD_|PYTHON|BASH_|SUPERVISOR_|HASSIO_|GITHUB_|ACTIONS_)',n): raise ValueError(f'Reserved custom_env name: {n}')
        if n in seen: raise ValueError(f'Duplicate custom_env name: {n}')
        if not isinstance(v,str) or '\0' in v or len(v.encode()) > 4096: raise ValueError('Invalid custom_env value')
        total+=len(n)+len(v.encode())
        if total > 32768: raise ValueError('custom_env exceeds 32 KiB')
        if n == 'TZ':
            try: ZoneInfo(v)
            except (ZoneInfoNotFoundError,ValueError): raise ValueError('Invalid TZ') from None
        seen.add(n); result.append({'name':n,'value':v})
    return result

def validate_options(raw, require_credentials=True):
    if not isinstance(raw,dict) or set(raw)-set(DEFAULTS): raise ValueError('Unknown option or invalid options object')
    o=copy.deepcopy(DEFAULTS);o.update(copy.deepcopy(raw))
    for k,v in DEFAULTS.items():
        if isinstance(v,bool) and type(o[k]) is not bool: raise ValueError(f'{k}: expected boolean')
    for k,(lo,hi) in RANGES.items():
        if type(o[k]) is not int or not lo <= o[k] <= hi: raise ValueError(f'{k}: expected {lo}..{hi}')
    for k,values in {'cache_mode':['off','memory','disk'],'tls_mode':['files','self_signed'],'language':['pl','en'],'log_level':['info','warning','error']}.items():
        if o[k] not in values: raise ValueError(f'Invalid {k}')
    if not o['enable_http'] and not o['enable_https']: raise ValueError('Enable at least one proxy listener')
    for key in ['allowed_networks','denied_networks']:
        if not isinstance(o[key],list) or len(o[key])>100 or (key=='allowed_networks' and not o[key]): raise ValueError(f'Invalid {key}')
        parsed=[]
        for value in o[key]:
            try: n=ipaddress.ip_network(string(value,key),strict=True)
            except ValueError: raise ValueError(f'{key}: use canonical IPv4/IPv6 CIDR networks') from None
            if key=='allowed_networks' and not o['allow_public_clients'] and not any(n.version==p.version and n.subnet_of(p) for p in PRIVATE_CLIENTS): raise ValueError('Public source networks require allow_public_clients')
            parsed.append(str(n))
        o[key]=list(dict.fromkeys(parsed))
    if o['allow_public_clients'] and (not o['auth_enabled'] or not o['enable_https'] or o['enable_http']): raise ValueError('Public clients require authentication and HTTPS-only mode')
    for key in ['http_safe_ports','https_connect_ports']:
        v=o[key]
        if not isinstance(v,list) or not 1<=len(v)<=32 or any(type(p) is not int or not 1<=p<=65535 for p in v): raise ValueError(f'Invalid {key}')
        if any(p in {7,9,19,20,21,22,23,25,53,110,135,137,138,139,143,445,465,587,993,995,13128,8099} for p in v): raise ValueError(f'{key}: unsafe service port')
        o[key]=sorted(set(v))
    if not set(o['https_connect_ports']) <= set(o['http_safe_ports']): raise ValueError('CONNECT ports must also be safe ports')
    if o['cache_object_memory_kb']>o['cache_mem_mb']*1024: raise ValueError('Memory object exceeds cache memory')
    if o['cache_max_object_mb']>o['cache_disk_mb']: raise ValueError('Cache object exceeds disk cache limit')
    o['allowed_domains']=domains(o['allowed_domains'],'allowed_domains');o['blocked_domains']=domains(o['blocked_domains'],'blocked_domains')
    if not isinstance(o['dns_servers'],list) or len(o['dns_servers'])>8: raise ValueError('Invalid dns_servers')
    try: o['dns_servers']=[str(ipaddress.ip_address(string(v,'dns_servers'))) for v in o['dns_servers']]
    except ValueError: raise ValueError('dns_servers: expected IP addresses') from None
    for k in ['certfile','keyfile']:
        if not re.fullmatch(r'[A-Za-z0-9_.-]{1,128}',string(o[k],k)) or '..' in o[k]: raise ValueError(f'Invalid {k}')
    o['tls_domain']=domains([o['tls_domain']],'tls_domain')[0]
    if o['tls_domain'].startswith('.'): raise ValueError('tls_domain must be a host name')
    users=[{'username':o['proxy_user'],'password':o['proxy_password']}]
    if not isinstance(o['additional_users'],list) or len(o['additional_users'])>31: raise ValueError('additional_users: maximum 31 users')
    users+=o['additional_users'];seen=set()
    for u in users:
        if not isinstance(u,dict) or set(u)!={'username','password'} or not USERNAME.fullmatch(string(u['username'],'username')): raise ValueError('Invalid proxy username')
        if u['username'] in seen: raise ValueError('Duplicate proxy username')
        p=string(u['password'],'proxy password',1024)
        if o['auth_enabled'] and require_credentials and not 16<=len(p.encode())<=72: raise ValueError('Proxy passwords must contain 16..72 UTF-8 bytes')
        seen.add(u['username'])
    o['custom_env']=environment(o['custom_env'])
    return o

def render(o,run_dir='/run/squid-ha',data_dir='/data'):
    for value in (run_dir,data_dir):
        if not re.fullmatch(r'/[A-Za-z0-9_./-]+',str(value)) or '..' in Path(value).parts: raise ValueError('Unsafe runtime path')
    lines=['# Generated by Squid Proxy HA; no user-supplied directives',
        'visible_hostname squid-proxy','httpd_suppress_version_string on',
        f'http_port 127.0.0.1:13128 name=monitor',
        'acl monitor myportname monitor','acl stats_read urlpath_regex ^/squid-internal-mgr/(info|counters)$',
        'acl stats_method method GET','http_access allow monitor localhost manager stats_read stats_method',
        'http_access deny manager','http_access deny monitor',
        'acl clients src '+' '.join(o['allowed_networks'])]
    if o['denied_networks']: lines+=['acl denied_clients src '+' '.join(o['denied_networks']),'http_access deny denied_clients']
    lines+=['http_access deny !clients',
        'acl Safe_ports port '+' '.join(map(str,o['http_safe_ports'])),
        'acl SSL_ports port '+' '.join(map(str,o['https_connect_ports'])),
        'http_access deny !Safe_ports','http_access deny CONNECT !SSL_ports',
        'acl allowed_methods method GET HEAD POST PUT DELETE OPTIONS PATCH CONNECT','http_access deny !allowed_methods',
        'acl blocked_dst dst '+' '.join(ALWAYS_BLOCKED+([] if o['allow_private_destinations'] else PRIVATE_DESTINATIONS)),
        'http_access deny blocked_dst',
        f'acl too_many maxconn {o["max_connections_per_client"]}','http_access deny too_many']
    if o['blocked_domains']: lines+=['acl denied_domains dstdomain -n '+' '.join(o['blocked_domains']),'http_access deny denied_domains']
    if o['allowed_domains']: lines+=['acl permitted_domains dstdomain -n '+' '.join(o['allowed_domains']),'http_access deny !permitted_domains']
    if o['auth_enabled']:
        lines += [f'auth_param basic program /usr/lib/squid/basic_ncsa_auth {run_dir}/passwd',
                  'auth_param basic realm Squid Proxy HA', 'auth_param basic children 4 startup=1 idle=1',
                  f'auth_param basic credentialsttl {o["auth_cache_seconds"]} seconds','auth_param basic casesensitive on',
                  'acl authenticated proxy_auth REQUIRED','http_access allow clients authenticated']
    else: lines+=['http_access allow clients']
    lines+=['http_access deny all']
    if o['enable_http']: lines+=['http_port 3128 name=plain']
    if o['enable_https']: lines+=[f'https_port 3129 name=secure tls-cert={run_dir}/cert.pem tls-key={run_dir}/key.pem tls-min-version=1.2']
    if o['dns_servers']: lines+=['dns_nameservers '+' '.join(o['dns_servers'])]
    if o['cache_mode']=='off': lines+=['cache deny all','cache_mem 0 MB']
    else:
        lines += [f'cache_mem {o["cache_mem_mb"]} MB',f'maximum_object_size_in_memory {o["cache_object_memory_kb"]} KB',f'maximum_object_size {o["cache_max_object_mb"]} MB']
        if o['cache_mode']=='disk': lines+=[f'cache_dir ufs {data_dir}/cache {o["cache_disk_mb"]} 16 256']
    if o['access_log']:
        lines+=['logformat ha %ts.%03tu %tr '+('%>a ' if o['log_client_ips'] else '')+'%rm %>Hs %<st','access_log stdio:/dev/stdout ha']
    else: lines+=['access_log none']
    lines += ['cache_log /dev/stderr','cache_store_log none','logfile_rotate 0',
        'debug_options ALL,'+('1' if o['log_level']=='info' else '0'),
        f'pid_filename {run_dir}/squid.pid',f'coredump_dir {run_dir}',
        'cache_effective_user proxyha','cache_effective_group proxyha',
        'icp_port 0',
        'via on','forwarded_for delete','follow_x_forwarded_for deny all',
        'request_header_access X-Forwarded-For deny all','request_header_access Forwarded deny all',
        'request_header_access Proxy-Authorization deny all',
        f'request_body_max_size {o["request_body_max_mb"]} MB',
        f'connect_timeout {o["connect_timeout_seconds"]} seconds',f'request_timeout {o["request_timeout_seconds"]} seconds',
        f'read_timeout {o["read_timeout_seconds"]} seconds',f'client_lifetime {o["client_lifetime_minutes"]} minutes',
        f'shutdown_lifetime {o["shutdown_timeout_seconds"]} seconds','uri_whitespace deny']
    return '\n'.join(lines)+'\n'

def load(path='/data/options.json'):
    try: raw=json.loads(Path(path).read_text())
    except FileNotFoundError: raw={}
    return validate_options(raw)
