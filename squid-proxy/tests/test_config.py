import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'runtime'))
from config import DEFAULTS, validate_options, render, environment, load
from service import regular_read, private_write, Handler, Dashboard
PASSWORD='fixture-only-long-password'

def opts(**patches): return validate_options({'proxy_password':PASSWORD,**patches})

class ConfigTests(unittest.TestCase):
    def test_empty_credentials_fail_before_opening_listeners(self):
        with self.assertRaisesRegex(ValueError,'16..72'):validate_options({})
        self.assertFalse(opts()['allow_public_clients'])
    def test_strict_types_and_unknown_options(self):
        for patch in [{'auth_enabled':'true'},{'cache_mem_mb':True},{'cache_disk_mb':-1},{'enable_http':False},{'extra':'http_access allow all'},{'cache_mode':'volatile'}]:
            with self.subTest(patch=patch),self.assertRaises(ValueError):opts(**patch)
    def test_no_password_command_or_config_injection(self):
        for patch in [{'proxy_user':'x\nauth_param no'},{'proxy_password':'secret\nlineover16long'},{'proxy_password':'a'*73},{'proxy_user':'../escape'},{'certfile':'../key.pem'},{'tls_domain':'a;sh'},{'dns_servers':['1.1.1.1\nhttp_access allow all']}]:
            with self.subTest(keys=list(patch)),self.assertRaises(ValueError):opts(**patch)
        o=opts(proxy_password='literal-$()-`not-a-shell`');text=render(o)
        self.assertNotIn(o['proxy_password'],text)
        self.assertNotIn('literal-',text)
    def test_source_ranges_canonical_and_private_by_default(self):
        for nets in [[],['0.0.0.0/0'],['192.168.1.1/24'],['example.com'],['192.168.0.0/16\nallow all']]:
            with self.subTest(nets=nets),self.assertRaises(ValueError):opts(allowed_networks=nets)
        self.assertEqual(opts(allowed_networks=['192.168.1.3/32'])['allowed_networks'],['192.168.1.3/32'])
    def test_public_sources_require_tls_only_and_auth(self):
        for patch in [{'allow_public_clients':True},{'allow_public_clients':True,'enable_https':True},{'allow_public_clients':True,'enable_http':False,'enable_https':True,'auth_enabled':False}]:
            with self.subTest(patch=patch),self.assertRaises(ValueError):opts(**patch)
        o=opts(allow_public_clients=True,enable_https=True,enable_http=False,allowed_networks=['203.0.113.4/32']);self.assertTrue(o['auth_enabled'])
    def test_optional_no_auth_still_requires_restricted_source(self):
        o=opts(auth_enabled=False,proxy_password='');self.assertNotIn('auth_param',render(o));self.assertIn('http_access deny !clients',render(o))
        with self.assertRaises(ValueError):opts(auth_enabled=False,allowed_networks=['0.0.0.0/0'])
    def test_domains_are_normalized_and_bounded_not_regex_or_urls(self):
        o=opts(allowed_domains=['*.EXAMPLE.com','*.EXAMPLE.com','żółw.example']);self.assertEqual(o['allowed_domains'],['.example.com','xn--w-uga1v8h.example'])
        for domain in ['https://example.com','example.com/path','x\nhttp_access','-invalid.example','127.0.0.1','*','[::1]','a:80']:
            with self.subTest(domain=domain),self.assertRaises(ValueError):opts(blocked_domains=[domain])
    def test_network_and_destination_guards_precede_allow(self):
        c=render(opts())
        for deny in ['http_access deny !clients','http_access deny !Safe_ports','http_access deny CONNECT !SSL_ports','http_access deny blocked_dst','http_access deny manager']:
            self.assertLess(c.index(deny),c.index('http_access allow clients authenticated'))
        self.assertIn('172.30.32.0/23',c);self.assertIn('169.254.0.0/16',c)
        private=render(opts(allow_private_destinations=True));self.assertIn('127.0.0.0/8',private);self.assertIn('172.30.32.0/23',private);self.assertNotIn('192.168.0.0/16\nhttp_access deny blocked_dst',private)
    def test_unsafe_ports_and_tunnel_bypass_rejected(self):
        for patch in [{'http_safe_ports':[25,443]},{'https_connect_ports':[22]},{'http_safe_ports':[80],'https_connect_ports':[443]},{'http_safe_ports':[True,443]},{'http_safe_ports':list(range(80,114))}]:
            with self.subTest(patch=patch),self.assertRaises(ValueError):opts(**patch)
    def test_cache_limits_and_modes(self):
        self.assertIn('cache deny all',render(opts()))
        self.assertNotIn('cache_dir',render(opts(cache_mode='memory')))
        self.assertIn('cache_dir ufs /data/cache 512',render(opts(cache_mode='disk')))
        with self.assertRaises(ValueError):opts(cache_max_object_mb=513)
    def test_auth_multiple_users_and_utf8_bcrypt_bound(self):
        self.assertEqual(len(opts(additional_users=[{'username':'second','password':PASSWORD}])['additional_users']),1)
        for users in [[{'username':'squidadmin','password':PASSWORD}],[{'username':'second','password':'short'}],[{'username':'second','password':PASSWORD,'command':'x'}]]:
            with self.assertRaises(ValueError):opts(additional_users=users)
        with self.assertRaises(ValueError):opts(proxy_password='é'*37)
    def test_dns_is_ip_only_and_ipv6_valid(self):
        self.assertEqual(opts(dns_servers=['192.0.2.53','2001:db8::53'])['dns_servers'],['192.0.2.53','2001:db8::53'])
        with self.assertRaises(ValueError):opts(dns_servers=['dns.example'])
    def test_logging_excludes_passwords_urls_and_usernames(self):
        c=render(opts(access_log=True))
        self.assertNotIn('%ru',c);self.assertNotIn('%un',c);self.assertNotIn('%>a',c)
        self.assertIn('%>a',render(opts(access_log=True,log_client_ips=True)))
        self.assertIn('access_log none',render(opts()))
    def test_custom_env_protects_native_and_python_startup(self):
        for name in ['LD_PRELOAD','PYTHONPATH','PATH','SQUID_HA_DATA_DIR','SUPERVISOR_TOKEN','GCONV_PATH']:
            with self.subTest(name=name),self.assertRaises(ValueError):environment([{'name':name,'value':'x'}])
        self.assertEqual(environment([{'name':'MY_TAG','value':'literal `x` $(x)'}])[0]['value'],'literal `x` $(x)')
        for entries in [[{'name':'A','value':'x'},{'name':'A','value':'y'}],[{'name':'A','value':'\0'}],[{'name':'A','value':'x'*4097}]]:
            with self.assertRaises(ValueError):environment(entries)
    def test_default_and_input_lists_are_not_shared(self):
        inp={'additional_users':[{'username':'second','password':PASSWORD}]};o=opts(**inp);o['additional_users'][0]['username']='changed'
        self.assertEqual(inp['additional_users'][0]['username'],'second');self.assertEqual(DEFAULTS['additional_users'],[])
    def test_paths_and_credentials_file_never_follow_symlinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);private_write(p/'secret','protected');(p/'link').symlink_to(p/'secret')
            with self.assertRaises(OSError):private_write(p/'link','evil')
            with self.assertRaises(OSError):regular_read(p/'link')
            self.assertEqual((p/'secret').read_text(),'protected')
            self.assertEqual((p/'secret').stat().st_mode&0o777,0o600)
    def test_invalid_json_and_missing_options_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'options.json'
            with self.assertRaises(ValueError):load(p)
            p.write_text('{');
            with self.assertRaises(json.JSONDecodeError):load(p)
    def test_config_directives_never_accept_untrusted_paths(self):
        with self.assertRaises(ValueError):render(opts(),run_dir='/tmp/run\nhttp_access allow all')
        with self.assertRaises(ValueError):render(opts(),data_dir='/tmp/../escape')

class DashboardTests(unittest.TestCase):
    def handler(self,peer,path='/',headers=None):
        h=object.__new__(Handler);h.client_address=(peer,42);h.path=path;h.headers=headers or {};h.command='GET';h.server=type('Server',(),{'options':opts(),'status':lambda self:{'healthy':True}})();h.result=None
        h.send=lambda status,data,ctype=None:setattr(h,'result',(status,data,ctype));return h
    def test_ingress_actual_peer_not_forwarded_headers(self):
        h=self.handler('127.0.0.1','/api/status',{'X-Forwarded-For':'172.30.32.2'});h.do_GET();self.assertEqual(h.result[0],403)
        h=self.handler('172.30.32.2','/api/status');h.do_GET();self.assertEqual(h.result[0],200)
    def test_dynamic_ingress_assets_local_and_bad_prefix_denied(self):
        h=self.handler('172.30.32.2','/',{'X-Ingress-Path':'/api/hassio_ingress/TEST_TOKEN'});h.do_GET();self.assertEqual(h.result[0],200);self.assertIn(b'/api/hassio_ingress/TEST_TOKEN/app.js',h.result[1]);self.assertNotIn(b'cdn.',h.result[1])
        for prefix in ['//evil.test','/x\" onload=x','/../x']:
            h=self.handler('172.30.32.2','/',{'X-Ingress-Path':prefix});h.do_GET();self.assertEqual(h.result[0],400)
    def test_path_traversal_and_unknown_files_are_not_served(self):
        for path in ['/../options.json','/app.js/../../passwd','/runtime/service.py','/api/config']:
            h=self.handler('172.30.32.2',path);h.do_GET();self.assertEqual(h.result[0],404)
    def test_dashboard_has_no_mutating_endpoints(self):
        h=self.handler('172.30.32.2');h.do_POST();self.assertEqual(h.result[0],405)

if __name__=='__main__':unittest.main()
