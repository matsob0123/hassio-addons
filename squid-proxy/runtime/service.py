"""One non-root Python supervisor, one Squid child; no web mutations or arbitrary commands."""

import argparse
import contextlib
import ipaddress
import json
import os
import pwd
import re
import select
import signal
import socket
import ssl
import stat
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from config import load, render

ROOT = Path(__file__).resolve().parent
RELEASE = json.loads((ROOT.parent / "release.json").read_text())


def private_write(path, data):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "wb") as stream:
        os.fchmod(stream.fileno(), 0o600)
        stream.write(data if isinstance(data, bytes) else data.encode())


def regular_read(path, maximum=1024 * 1024):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, "rb") as stream:
        if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
            raise ValueError("Expected a regular file")
        data = stream.read(maximum + 1)
        if len(data) > maximum:
            raise ValueError("File too large")
        return data


def initialize(o, data, run, ssl_dir):
    os.umask(0o077)
    for p in [data, run]:
        p.mkdir(parents=True, exist_ok=True)
        if p.is_symlink() or not p.is_dir():
            raise ValueError("Unsafe data/run directory")
    for entry in ["squid.conf", "passwd", "cert.pem", "key.pem", "squid.pid"]:
        p = run / entry
        if p.is_symlink():
            raise ValueError("Unsafe runtime file")
    if o["auth_enabled"]:
        users = [{"username": o["proxy_user"], "password": o["proxy_password"]}] + o[
            "additional_users"
        ]
        password_file = run / "passwd"
        private_write(password_file, b"")
        for u in users:
            # Password passes on stdin, never through argv or shell.
            subprocess.run(
                [
                    "/usr/bin/htpasswd",
                    "-B",
                    "-C",
                    "10",
                    "-i",
                    str(password_file),
                    u["username"],
                ],
                input=(u["password"] + "\n").encode(),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
                timeout=10,
            )
    if o["enable_https"]:
        cert, key = run / "cert.pem", run / "key.pem"
        if o["tls_mode"] == "files":
            private_write(cert, regular_read(ssl_dir / o["certfile"]))
            private_write(key, regular_read(ssl_dir / o["keyfile"]))
        else:
            tls = data / "tls"
            tls.mkdir(mode=0o700, exist_ok=True)
            if tls.is_symlink():
                raise ValueError("Unsafe TLS directory")
            persistent_cert, persistent_key = tls / "cert.pem", tls / "key.pem"
            # Renew self-signed certificates on startup with less than 30 days remaining.
            # Never silently downgrade to HTTP.
            domainfile = tls / "domain"
            same = (
                domainfile.exists()
                and regular_read(domainfile, 253).decode() == o["tls_domain"]
            )
            renew = True
            if same and persistent_cert.exists() and persistent_key.exists():
                regular_read(persistent_cert)
                regular_read(persistent_key)
                expiry = ssl._ssl._test_decode_cert(str(persistent_cert)).get(
                    "notAfter"
                )
                renew = (
                    not expiry
                    or ssl.cert_time_to_seconds(expiry) < time.time() + 30 * 86400
                )
            if renew:
                for p in [persistent_cert, persistent_key]:
                    if p.is_symlink():
                        raise ValueError("Unsafe TLS file")
                subprocess.run(
                    [
                        "/usr/bin/openssl",
                        "req",
                        "-new",
                        "-newkey",
                        "rsa:3072",
                        "-nodes",
                        "-x509",
                        "-days",
                        "365",
                        "-subj",
                        "/CN=" + o["tls_domain"],
                        "-addext",
                        "subjectAltName=DNS:" + o["tls_domain"],
                        "-keyout",
                        str(persistent_key),
                        "-out",
                        str(persistent_cert),
                    ],
                    check=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=90,
                )
                for p in [persistent_cert, persistent_key]:
                    private_write(p, regular_read(p))
                private_write(domainfile, o["tls_domain"])
            private_write(cert, regular_read(persistent_cert))
            private_write(key, regular_read(persistent_key))
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(
            cert, key
        )  # Reject mismatched/broken key material before opening listeners.
        expiry = ssl._ssl._test_decode_cert(str(cert)).get("notAfter")
        if not expiry or ssl.cert_time_to_seconds(expiry) <= time.time():
            raise ValueError("Proxy certificate expired")
    private_write(run / "squid.conf", render(o, str(run), str(data)))
    if o["cache_mode"] == "disk":
        cache = data / "cache"
        cache.mkdir(mode=0o700, exist_ok=True)
        if cache.is_symlink():
            raise ValueError("Unsafe cache directory")
    # Bootstrap owns only app paths, then permanently discards root privileges.
    # Never traverse cache entries, mounted /ssl, options.json or arbitrary symlinks.
    if os.geteuid() == 0:
        account = pwd.getpwnam("proxyha")
        for p in [data, run, *run.iterdir(), data / "cache", data / "tls"]:
            if p.exists():
                if p.is_symlink():
                    raise ValueError("Unsafe app path")
                os.chown(p, account.pw_uid, account.pw_gid, follow_symlinks=False)
        if (data / "tls").exists():
            for p in (data / "tls").iterdir():
                if p.is_symlink():
                    raise ValueError("Unsafe TLS file")
                os.chown(p, account.pw_uid, account.pw_gid, follow_symlinks=False)
        os.setgroups([])
        os.setgid(account.pw_gid)
        os.setuid(account.pw_uid)
    if os.geteuid() == 0:
        raise ValueError("Refusing to run proxy or dashboard as root")
    # No secret is exposed through the status whitelist below.
    for e in o["custom_env"]:
        os.environ[e["name"]] = e["value"]
    if hasattr(time, "tzset"):
        time.tzset()


class Dashboard(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 16

    def __init__(self, address, o, child):
        self.options = o
        self.child = child
        self.started = time.monotonic()
        self.slots = threading.BoundedSemaphore(24)
        super().__init__(address, Handler)

    def get_request(self):
        sock, peer = super().get_request()
        sock.settimeout(5)
        return sock, peer

    def process_request(self, request, address):
        if not self.slots.acquire(blocking=False):
            request.close()
            return
        try:
            super().process_request(request, address)
        except BaseException:
            self.slots.release()
            raise

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.slots.release()

    def handle_error(self, request, address):
        pass

    def manager(self):
        with socket.create_connection(("127.0.0.1", 13128), timeout=1) as s:
            s.settimeout(1)
            s.sendall(
                b"GET /squid-internal-mgr/info HTTP/1.0\r\nHost: localhost\r\n\r\n"
            )
            data = b""
            while len(data) < 131072:
                chunk = s.recv(4096)
                if not chunk:
                    break
                data += chunk
        if not re.match(rb"HTTP/1\.[01] 200 ", data):
            raise OSError("Squid manager unavailable")
        return data.decode("utf-8", "replace")

    def apparmor(self):
        try:
            return Path("/proc/self/attr/current").read_text().strip()
        except OSError:
            return "unavailable"

    def status(self):
        text = self.manager()
        o = self.options
        requests = re.search(r"Number of HTTP requests received:\s*(\d+)", text)
        memory = None
        try:
            memory = round(
                int(Path("/sys/fs/cgroup/memory.current").read_text()) / 1048576, 1
            )
        except (OSError, ValueError):
            pass
        return {
            "version": RELEASE["version"],
            "squidVersion": RELEASE["squid_version"],
            "healthy": self.child.poll() is None,
            "uptimeSeconds": round(time.monotonic() - self.started),
            "requests": int(requests.group(1)) if requests else 0,
            "memoryMiB": memory,
            "http": o["enable_http"],
            "https": o["enable_https"],
            "authentication": o["auth_enabled"],
            "userCount": 1 + len(o["additional_users"]) if o["auth_enabled"] else 0,
            "allowedNetworks": o["allowed_networks"],
            "dnsServers": o["dns_servers"],
            "cacheMode": o["cache_mode"],
            "cacheMemoryMiB": o["cache_mem_mb"],
            "cacheDiskMiB": o["cache_disk_mb"],
            "privateDestinations": o["allow_private_destinations"],
            "allowedDomainCount": len(o["allowed_domains"]),
            "blockedDomainCount": len(o["blocked_domains"]),
            "accessLogging": o["access_log"],
            "uid": os.geteuid(),
            "apparmor": self.apparmor(),
        }


class Handler(BaseHTTPRequestHandler):
    server_version = "SquidHA"
    sys_version = ""

    def log_message(self, *args):
        pass  # Ingress paths contain authentication tokens.

    def send(self, status, content, ctype="application/json; charset=utf-8"):
        data = content if isinstance(content, bytes) else json.dumps(content).encode()
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
        )
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def do_GET(self):
        peer = ipaddress.ip_address(self.client_address[0])
        path = urlsplit(self.path).path
        if path == "/health":
            if str(peer) not in ["127.0.0.1", "::1", "172.30.32.2"]:
                return self.send(403, {"error": "Forbidden"})
            try:
                if self.server.child.poll() is not None:
                    raise OSError()
                self.server.manager()
                return self.send(200, {"status": "ok"})
            except OSError:
                return self.send(503, {"status": "unavailable"})
        if str(peer) != "172.30.32.2":
            return self.send(
                403, {"error": "Only the Supervisor can access this dashboard"}
            )
        if path == "/api/status":
            try:
                return self.send(200, self.server.status())
            except OSError:
                return self.send(503, {"error": "Squid unavailable"})
        static = {
            "/": ("index.html", "text/html; charset=utf-8"),
            "/app.js": ("app.js", "text/javascript; charset=utf-8"),
            "/style.css": ("style.css", "text/css; charset=utf-8"),
        }
        if path not in static:
            return self.send(404, {"error": "Not found"})
        filename, ctype = static[path]
        data = (ROOT.parent / "web" / filename).read_bytes()
        if path == "/":
            prefix = self.headers.get("X-Ingress-Path", "")
            if prefix and (
                len(prefix) > 512
                or not re.fullmatch(r"/[A-Za-z0-9_/-]+", prefix)
                or "//" in prefix
                or ".." in prefix
            ):
                return self.send(400, {"error": "Invalid Ingress path"})
            base = prefix.rstrip("/") + "/"
            data = data.replace(b"__BASE__", base.encode()).replace(
                b"__LANG__", self.server.options["language"].encode()
            )
        return self.send(200, data, ctype)

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        self.send(405, {"error": "Read-only dashboard"})

    do_PUT = do_POST
    do_DELETE = do_POST
    do_PATCH = do_POST


@contextlib.contextmanager
def access_log_relay(run):
    """A private FIFO avoids reopening root-owned container stdout after setuid."""
    fifo = run / "access.fifo"
    if fifo.exists():
        if fifo.is_symlink() or not stat.S_ISFIFO(fifo.lstat().st_mode):
            raise ValueError("Unsafe access log pipe")
        fifo.unlink()
    os.mkfifo(fifo, 0o600)
    fd = os.open(fifo, os.O_RDWR | os.O_NONBLOCK | os.O_NOFOLLOW)
    stopped = threading.Event()

    def relay():
        pending = b""
        while True:
            readable, _, _ = select.select(
                [fd], [], [], 0 if stopped.is_set() else 0.25
            )
            if readable:
                pending += os.read(fd, 8192)
                while b"\n" in pending:
                    line, pending = pending.split(b"\n", 1)
                    clean = "".join(
                        c
                        for c in line.decode("ascii", "replace")
                        if 32 <= ord(c) <= 126
                    )
                    print("[access] " + clean[:2048], flush=True)
                if len(pending) > 8192:
                    pending = b""
            elif stopped.is_set():
                break

    thread = threading.Thread(target=relay, daemon=True)
    thread.start()
    try:
        yield
    finally:
        stopped.set()
        thread.join(timeout=2)
        os.close(fd)
        fifo.unlink(missing_ok=True)


def main():
    with contextlib.ExitStack() as stack:
        return run_service(stack)


def run_service(stack):
    data = Path(os.environ.get("SQUID_HA_DATA_DIR", "/data"))
    run = Path(os.environ.get("SQUID_HA_RUN_DIR", "/run/squid-ha"))
    o = load(data / "options.json")
    initialize(o, data, run, Path(os.environ.get("SQUID_HA_SSL_DIR", "/ssl")))
    if o["access_log"]:
        stack.enter_context(access_log_relay(run))
    verbosity = "1" if o["log_level"] == "info" else "0"
    conf = str(run / "squid.conf")
    subprocess.run(
        ["/usr/sbin/squid", "-k", "parse", "-f", conf],
        check=True,
        timeout=30,
        stdout=subprocess.DEVNULL,
    )
    if o["cache_mode"] == "disk" and not (data / "cache" / "00").exists():
        subprocess.run(
            ["/usr/sbin/squid", "-z", "-N", "-d", verbosity, "-f", conf],
            check=True,
            timeout=60,
        )
    child = subprocess.Popen(
        ["/usr/sbin/squid", "-N", "-d", verbosity, "-f", conf], stdin=subprocess.DEVNULL
    )
    server = None
    stopping = threading.Event()

    def stop(signum=None, frame=None):
        stopping.set()
        if child.poll() is None:
            child.terminate()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        server = Dashboard(("0.0.0.0", 8099), o, child)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        print(
            f'Squid Proxy HA {RELEASE["version"]}; uid={os.geteuid()}; HTTP={o["enable_http"]}; HTTPS={o["enable_https"]}; auth={o["auth_enabled"]}',
            flush=True,
        )
        while child.poll() is None and not stopping.wait(0.25):
            pass
        if not stopping.is_set():
            raise RuntimeError("Squid exited unexpectedly")
    finally:
        stop()
        if server:
            server.shutdown()
            server.server_close()
        try:
            child.wait(timeout=o["shutdown_timeout_seconds"] + 3)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
    return 0 if child.returncode == 0 else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        # Exception strings must never include complete options/passwords or argv.
        print(
            "Squid Proxy HA startup/runtime failed: "
            + (
                str(exc)
                if isinstance(exc, (ValueError, FileNotFoundError, PermissionError))
                else type(exc).__name__
            ),
            file=sys.stderr,
        )
        sys.exit(1)
