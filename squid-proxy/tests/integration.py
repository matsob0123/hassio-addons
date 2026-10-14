"""Actual Squid, auth, DNS, CONNECT, TLS, cache, non-root and enforced AppArmor.
Run inside the built image on two disposable Docker networks (see CI).
No production secrets or external websites are needed.
"""

import base64
import contextlib
import http.client
import json
import os
from pathlib import Path
import shutil
import socket
import ssl
import struct
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path("/app")
PASSWORD = "test-only-password-for-ci"
PRIMARY_IP = os.environ.get("SQUID_TEST_ORIGIN_IP", "172.28.50.2")
INGRESS_IP = "172.30.32.2"
COUNTS = {}
DNS_QUERIES = []


class Origin(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def do_GET(self):
        COUNTS[self.path] = COUNTS.get(self.path, 0) + 1
        body = json.dumps(
            {
                "path": self.path,
                "headers": dict(self.headers),
                "counter": COUNTS[self.path],
            }
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(body)


class Dns:
    def __init__(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.bind(("127.0.0.1", 53))
        self.closed = False
        threading.Thread(target=self.loop, daemon=True).start()

    def loop(self):
        while not self.closed:
            try:
                q, addr = self.sock.recvfrom(4096)
                i = 12
                labels = []
                while q[i]:
                    n = q[i]
                    labels.append(q[i + 1 : i + 1 + n].decode())
                    i += n + 1
                end = i + 5
                typ = struct.unpack("!H", q[i + 1 : i + 3])[0]
                name = ".".join(labels)
                DNS_QUERIES.append(name)
                answers = (
                    1 if typ == 1 and name in ["origin.test", "blocked.test"] else 0
                )
                response = (
                    q[:2]
                    + b"\x81\x80"
                    + struct.pack("!HHHH", 1, answers, 0, 0)
                    + q[12:end]
                )
                if answers:
                    response += (
                        b"\xc0\x0c"
                        + struct.pack("!HHIH", 1, 1, 30, 4)
                        + socket.inet_aton(PRIMARY_IP)
                    )
                self.sock.sendto(response, addr)
            except OSError:
                break

    def close(self):
        self.closed = True
        self.sock.close()


class Suite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(tempfile.mkdtemp(prefix="squid-integration-"))
        cls.root.chmod(0o755)
        cls.cert = cls.root / "origin.pem"
        cls.key = cls.root / "origin-key.pem"
        subprocess.run(
            [
                "openssl",
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-days",
                "1",
                "-subj",
                "/CN=origin.test",
                "-addext",
                "subjectAltName=DNS:origin.test",
                "-keyout",
                str(cls.key),
                "-out",
                str(cls.cert),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        cls.http = ThreadingHTTPServer(("0.0.0.0", 18080), Origin)
        cls.https = ThreadingHTTPServer(("0.0.0.0", 18443), Origin)
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(cls.cert, cls.key)
        cls.https.socket = ctx.wrap_socket(cls.https.socket, server_side=True)
        for server in [cls.http, cls.https]:
            threading.Thread(target=server.serve_forever, daemon=True).start()
        cls.dns = Dns()

    @classmethod
    def tearDownClass(cls):
        cls.dns.close()
        for server in [cls.http, cls.https]:
            server.shutdown()
            server.server_close()
        shutil.rmtree(cls.root)

    def setUp(self):
        self.process = None
        self.tmp = Path(tempfile.mkdtemp(dir=self.root))
        self.tmp.chmod(0o755)

    def tearDown(self):
        if self.process:
            if self.process.poll() is None:
                self.process.terminate()
            try:
                self.process.wait(timeout=25)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
            self.logs.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def start(self, tls_files=None, **options):
        self.data = self.tmp / "data"
        self.data.mkdir(exist_ok=True)
        self.run = self.tmp / "run"
        self.ssl_dir = self.tmp / "ssl"
        self.ssl_dir.mkdir(exist_ok=True)
        if tls_files:
            shutil.copyfile(tls_files[0], self.ssl_dir / "fullchain.pem")
            shutil.copyfile(tls_files[1], self.ssl_dir / "privkey.pem")
        o = {
            "proxy_password": PASSWORD,
            "allowed_networks": ["127.0.0.1/32"],
            "allow_private_destinations": True,
            "http_safe_ports": [80, 443, 18080, 18443],
            "https_connect_ports": [443, 18443],
            "dns_servers": ["127.0.0.1"],
            "shutdown_timeout_seconds": 1,
            **options,
        }
        (self.data / "options.json").write_text(json.dumps(o))
        self.logs = (self.tmp / "process.log").open("w+")
        cmd = ["python3", "/app/runtime/service.py"]
        if os.environ.get("SQUID_HA_TEST_APPARMOR") == "1":
            cmd = ["aa-exec", "-p", "squid_proxy", "--"] + cmd
        self.process = subprocess.Popen(
            cmd,
            env={
                **os.environ,
                "SQUID_HA_DATA_DIR": str(self.data),
                "SQUID_HA_RUN_DIR": str(self.run),
                "SQUID_HA_SSL_DIR": str(self.ssl_dir),
            },
            stdout=self.logs,
            stderr=self.logs,
        )
        for _ in range(150):
            if self.process.poll() is not None:
                break
            try:
                if self.dashboard("/health")[0] == 200:
                    return
            except OSError:
                pass
            time.sleep(0.1)
        self.logs.flush()
        self.fail("Service failed to start:\n" + (self.tmp / "process.log").read_text())

    def dashboard(self, path, ingress=False, headers=None):
        c = http.client.HTTPConnection(
            "127.0.0.1",
            8099,
            timeout=4,
            source_address=(INGRESS_IP, 0) if ingress else None,
        )
        c.request("GET", path, headers=headers or {})
        r = c.getresponse()
        data = r.read()
        status = r.status
        h = dict(r.getheaders())
        c.close()
        return status, data, h

    def proxy(
        self,
        path="/",
        auth=True,
        host="origin.test",
        port=18080,
        method="GET",
        headers=None,
        proxy_port=3128,
        tls=False,
        context=None,
    ):
        if tls:
            c = http.client.HTTPSConnection(
                "127.0.0.1", proxy_port, context=context, timeout=5
            )
        else:
            c = http.client.HTTPConnection("127.0.0.1", proxy_port, timeout=5)
        h = {"Host": f"{host}:{port}", **(headers or {})}
        if auth:
            h["Proxy-Authorization"] = (
                "Basic "
                + base64.b64encode(("squidadmin:" + PASSWORD).encode()).decode()
            )
        c.request(method, f"http://{host}:{port}{path}", headers=h)
        r = c.getresponse()
        data = r.read()
        status = r.status
        response_headers = dict(r.getheaders())
        c.close()
        return status, data, response_headers

    def test_01_authentication_dns_and_header_privacy(self):
        self.start()
        self.assertEqual(self.proxy("/auth", auth=False)[0], 407)
        self.assertEqual(
            self.proxy(
                "/bad",
                headers={
                    "Proxy-Authorization": "Basic "
                    + base64.b64encode(b"squidadmin:wrong").decode()
                },
                auth=False,
            )[0],
            407,
        )
        status, data, _ = self.proxy(
            "/valid",
            headers={"X-Forwarded-For": "203.0.113.8", "Forwarded": "for=203.0.113.8"},
        )
        self.assertEqual(status, 200)
        headers = json.loads(data)["headers"]
        self.assertFalse(
            any(
                k.lower() in ["proxy-authorization", "x-forwarded-for", "forwarded"]
                for k in headers
            )
        )
        self.assertIn("origin.test", DNS_QUERIES)
        self.assertNotIn(PASSWORD, (self.run / "passwd").read_text())
        self.assertTrue(
            (self.run / "passwd").read_text().split(":")[1].startswith("$2")
        )
        self.assertEqual((self.run / "passwd").stat().st_mode & 0o777, 0o600)

    def test_02_ingress_peer_prefix_csp_and_secret_omission(self):
        self.start()
        self.assertEqual(
            self.dashboard("/api/status", headers={"X-Forwarded-For": INGRESS_IP})[0],
            403,
        )
        status, data, headers = self.dashboard(
            "/", True, {"X-Ingress-Path": "/api/hassio_ingress/TOKEN"}
        )
        self.assertEqual(status, 200)
        self.assertIn(b"/api/hassio_ingress/TOKEN/app.js", data)
        self.assertIn("script-src 'self'", headers["Content-Security-Policy"])
        self.assertNotIn("unsafe-inline", headers["Content-Security-Policy"])
        status, data, _ = self.dashboard("/api/status", True)
        self.assertEqual(status, 200)
        stats = json.loads(data)
        self.assertEqual(stats["uid"], 10001)
        self.assertNotIn(PASSWORD, data.decode())
        self.assertNotIn("custom_env", data.decode())
        self.assertTrue(stats["authentication"])
        if os.environ.get("SQUID_HA_TEST_APPARMOR") == "1":
            self.assertIn("squid_proxy", stats["apparmor"])
            self.assertIn("enforce", stats["apparmor"])
        self.assertEqual(self.dashboard("/../passwd", True)[0], 404)
        self.assertEqual(
            self.dashboard("/", True, {"X-Ingress-Path": "//evil.test"})[0], 400
        )

    def test_03_source_acl_cannot_be_bypassed_by_valid_login(self):
        self.start(
            allowed_networks=["192.0.2.0/24"],
            allow_public_clients=True,
            enable_http=False,
            enable_https=True,
            tls_mode="self_signed",
        )
        ctx = ssl._create_unverified_context()
        self.assertEqual(self.proxy(tls=True, proxy_port=3129, context=ctx)[0], 403)

    def test_04_unsafe_ports_methods_manager_and_controlplane_denied(self):
        self.start()
        self.assertEqual(self.proxy(port=25)[0], 403)
        self.assertEqual(self.proxy(method="TRACE")[0], 403)
        self.assertEqual(self.proxy(host="127.0.0.1")[0], 403)
        self.assertEqual(self.proxy(host="169.254.169.254")[0], 403)
        self.assertEqual(self.proxy(host="172.30.32.3")[0], 403)
        c = http.client.HTTPConnection("127.0.0.1", 3128, timeout=3)
        c.request("GET", "/squid-internal-mgr/info")
        r = c.getresponse()
        self.assertEqual(r.status, 403)
        r.read()
        c.close()
        c = http.client.HTTPConnection("127.0.0.1", 3128, timeout=3)
        c.request("CONNECT", "origin.test:18080")
        r = c.getresponse()
        self.assertEqual(r.status, 403)
        r.read()
        c.close()

    def test_05_private_destinations_are_denied_by_default(self):
        self.start(allow_private_destinations=False)
        self.assertEqual(self.proxy("/private")[0], 403)

    def test_06_domain_allow_and_deny_policy(self):
        self.start(allowed_domains=[".test"], blocked_domains=["blocked.test"])
        self.assertEqual(self.proxy("/domain")[0], 200)
        self.assertEqual(self.proxy("/blocked", host="blocked.test")[0], 403)
        self.assertEqual(self.proxy(host=PRIMARY_IP)[0], 403)

    def test_07_connect_tunnel_preserves_origin_certificate_and_bytes(self):
        self.start()
        s = socket.create_connection(("127.0.0.1", 3128), timeout=4)
        token = base64.b64encode(("squidadmin:" + PASSWORD).encode()).decode()
        s.sendall(
            f"CONNECT origin.test:18443 HTTP/1.1\r\nHost: origin.test:18443\r\nProxy-Authorization: Basic {token}\r\n\r\n".encode()
        )
        head = b""
        while b"\r\n\r\n" not in head:
            head += s.recv(1)
        self.assertIn(b"200 Connection established", head)
        ctx = ssl.create_default_context(cafile=str(self.cert))
        secure = ctx.wrap_socket(s, server_hostname="origin.test")
        self.assertEqual(
            secure.getpeercert()["subjectAltName"], (("DNS", "origin.test"),)
        )
        secure.sendall(
            b"GET /tunnel HTTP/1.1\r\nHost: origin.test\r\nConnection: close\r\n\r\n"
        )
        response = b""
        while data := secure.recv(4096):
            response += data
        secure.close()
        self.assertIn(b"200 OK", response)
        self.assertIn(b"/tunnel", response)

    def test_08_https_proxy_certificate_verification_and_http_disable(self):
        self.start(
            enable_http=False,
            enable_https=True,
            tls_mode="self_signed",
            tls_domain="localhost",
        )
        with self.assertRaises(OSError):
            socket.create_connection(("127.0.0.1", 3128), timeout=0.5)
        cert = self.data / "tls" / "cert.pem"
        ctx = ssl.create_default_context(cafile=str(cert))
        c = http.client.HTTPSConnection("localhost", 3129, context=ctx, timeout=4)
        token = base64.b64encode(("squidadmin:" + PASSWORD).encode()).decode()
        c.request(
            "GET",
            "http://origin.test:18080/secure-proxy",
            headers={"Proxy-Authorization": "Basic " + token},
        )
        r = c.getresponse()
        self.assertEqual(r.status, 200)
        r.read()
        c.close()
        with self.assertRaises(ssl.SSLCertVerificationError):
            self.proxy(tls=True, proxy_port=3129, context=ssl.create_default_context())

    def test_09_disk_cache_survives_restart_and_shutdown_drains(self):
        self.start(cache_mode="disk")
        status, _, _ = self.proxy("/cached")
        self.assertEqual(status, 200)
        time.sleep(0.2)
        before = COUNTS["/cached"]
        self.assertEqual(self.proxy("/cached")[0], 200)
        self.assertEqual(COUNTS["/cached"], before)
        self.process.terminate()
        self.assertEqual(self.process.wait(timeout=15), 0)
        self.logs.flush()
        self.assertNotIn(PASSWORD, (self.tmp / "process.log").read_text())
        self.assertTrue((self.data / "cache" / "00").is_dir())
        self.logs.close()
        self.start(cache_mode="disk")
        self.assertEqual(self.proxy("/cached")[0], 200)
        self.assertEqual(COUNTS["/cached"], before)

    def test_10_no_auth_is_opt_in_and_ingress_still_private(self):
        self.start(auth_enabled=False, proxy_password="")
        self.assertEqual(self.proxy("/no-auth", auth=False)[0], 200)
        self.assertEqual(self.dashboard("/")[0], 403)

    def test_11_invalid_configuration_never_opens_ports(self):
        self.data = self.tmp / "data"
        self.data.mkdir()
        (self.data / "options.json").write_text(json.dumps({"proxy_password": "short"}))
        p = subprocess.run(
            ["python3", "/app/runtime/service.py"],
            env={**os.environ, "SQUID_HA_DATA_DIR": str(self.data)},
            capture_output=True,
            timeout=10,
        )
        self.assertNotEqual(p.returncode, 0)
        self.assertNotIn(b"short", p.stderr)
        for port in [3128, 3129, 8099]:
            with self.assertRaises(OSError):
                socket.create_connection(("127.0.0.1", port), timeout=0.3)

    def test_12_multiple_accounts_custom_environment_and_file_tls(self):
        self.start(
            tls_files=(self.cert, self.key),
            enable_https=True,
            tls_mode="files",
            additional_users=[{"username": "second", "password": PASSWORD}],
            custom_env=[
                {"name": "MY_TAG", "value": "literal $(do-not-execute)"},
                {"name": "TZ", "value": "Europe/Warsaw"},
            ],
        )
        token = base64.b64encode(("second:" + PASSWORD).encode()).decode()
        self.assertEqual(
            self.proxy(
                "/second-user",
                auth=False,
                headers={"Proxy-Authorization": "Basic " + token},
            )[0],
            200,
        )
        # Origin fixture certificate is trusted only for its DNS name.
        c = http.client.HTTPSConnection(
            "origin.test",
            3129,
            context=ssl.create_default_context(cafile=str(self.cert)),
            timeout=4,
        )
        c.sock = ssl.create_default_context(cafile=str(self.cert)).wrap_socket(
            socket.create_connection(("127.0.0.1", 3129), timeout=4),
            server_hostname="origin.test",
        )
        c.request(
            "GET",
            "http://origin.test:18080/file-tls",
            headers={"Proxy-Authorization": "Basic " + token},
        )
        r = c.getresponse()
        self.assertEqual(r.status, 200)
        r.read()
        c.close()
        status, data, _ = self.dashboard("/api/status", True)
        self.assertEqual(json.loads(data)["userCount"], 2)
        self.assertNotIn(b"MY_TAG", data)

    def test_13_apparmor_denies_a_readable_file_outside_profile(self):
        if os.environ.get("SQUID_HA_TEST_APPARMOR") != "1":
            self.skipTest("AppArmor not enabled for this run")
        probe = Path("/audit-outside-profile")
        probe.write_text("not a secret")
        probe.chmod(0o644)
        code = "from pathlib import Path; print(Path('/proc/self/attr/current').read_text().strip());\ntry: Path('/audit-outside-profile').read_text(); raise SystemExit(42)\nexcept PermissionError: print('DENIED_AS_EXPECTED')"
        p = subprocess.run(
            ["aa-exec", "-p", "squid_proxy", "--", "python3", "-c", code],
            capture_output=True,
            timeout=5,
        )
        probe.unlink()
        self.assertEqual(p.returncode, 0, p.stderr.decode())
        self.assertIn(b"DENIED_AS_EXPECTED", p.stdout)


if __name__ == "__main__":
    result = unittest.TextTestRunner(verbosity=2).run(
        unittest.defaultTestLoader.loadTestsFromTestCase(Suite)
    )
    Path("/tmp/squid-integration-summary.json").write_text(
        json.dumps(
            {
                "tests": result.testsRun,
                "failures": len(result.failures),
                "errors": len(result.errors),
                "skipped": len(result.skipped),
                "architecture": os.uname().machine,
                "apparmor": os.environ.get("SQUID_HA_TEST_APPARMOR") == "1",
            },
            indent=2,
        )
    )
    sys.exit(0 if result.wasSuccessful() else 1)
