# Test report — Squid Proxy 1.0.0

Verified on 2026-10-14. [Final revision checks in PR #3](https://github.com/matsob0123/hassio-addons/pull/3/checks). Reproducible native baseline: [successful run 38589229890](https://github.com/matsob0123/hassio-addons/actions/runs/38589229890), commit `b2e872b9b10775b76545783ff52e9d9c1addf113`; the final revision additionally removes automatically injected HA API tokens before any subprocess and adds its regression test. See the PR checks for the exact final tested commit.

| Verification | Result |
|---|---|
| Python options, renderer, credentials, paths and Ingress policy | 23 tests passed locally and in CI |
| Fortnightly updater: manifests, clock boundaries, tampering, atomic git publication and release failure handling | 13 tests passed locally and in CI |
| Official Supervisor config, PL/EN translations and all 37 default options | Passed using isolated official Supervisor validators; no running Supervisor |
| AppArmor syntax, JavaScript syntax and workflow actionlint | Passed |
| Native amd64 image: build + real Squid integration | 14 tests passed, 0 skipped |
| Native aarch64 image: build + real Squid integration | 14 tests passed, 0 skipped |
| Actual AppArmor enforcement | Profile reported enforce mode; readable forbidden file denied on both architectures |
| Production entrypoint with Docker init and the production profile | Healthy, local dashboard denied, SIGTERM drained, exit 0 on both architectures |
| Trivy 0.76.0 installed OS package vulnerability scan | HIGH/CRITICAL gate passed on both images; no finding at these severities |
| ClamAV 1.5.4 source scan | 4154 files, 0 infected; 3628169 known signatures |
| Trivy source secrets/misconfiguration scan | No embedded secret; DS-0002 root-bootstrap finding retained and explained in SECURITY.md |
| Chromium dashboard fixture | PL/EN, dynamic prefix, status, responsive layout, escaped untrusted text, no external requests, no JS errors |
| Live Docker Hub updater check | Both actual architecture manifests verified; base digest unchanged; no fake version created |

## What the native integration tests do

Each architecture runs the compiled production Squid binary with a disposable HTTP origin, a TLS origin and a local DNS fixture. No third-party websites are probed. The service runs as UID/GID 10001 inside the enforced profile. A secondary Docker interface supplies the actual Supervisor peer address for Ingress checks; a spoofed forwarding header is rejected.

The 14 tests verify missing/wrong/valid Basic Auth, bcrypt and private credential files, source ACL independent of login, unsafe ports and methods, mandatory loopback/metadata/Supervisor destination blocks, default private-destination denial, allow/deny domains, configured DNS, stripped forwarding/credential headers, manager isolation, end-to-end CONNECT certificate verification, HTTPS proxy trust/hostname checking and disabled HTTP listener, persistent disk-cache hits after restart, graceful shutdown, explicit no-auth mode, fail-closed invalid startup, extra accounts, supplied TLS files, custom-env startup/privacy, optional access logging without URL/password leakage, and a real forbidden-file AppArmor denial.

The production smoke test additionally uses `docker --init`, mounts HA-style `/data/options.json`, applies the profile to the entire entrypoint and checks startup, health, dashboard access restriction and normal stop. The profile permits only Squid's named `/dev/shm/squid-*` files, rather than all shared memory. `docker-init` can forward stop signals across the UID change; the application permanently discards root before listeners. Access logs use a private FIFO so unprivileged Squid does not need to reopen root-owned container stdout.

## Limits of the evidence

No actual HA OS/Supervisor device was available. Installing/updating from the real app store, the displayed security badge, real sidebar/Ingress integration, watchdog operation, host SSL permissions, actual HA backup/restore and long-running behavior still require device acceptance. The manifest intentionally remains `stage: experimental`. Native Docker tests and official-schema checks are substantial evidence but do not substitute for that device test.

Trivy's package scan covers installed Alpine packages. Squid is compiled directly from official source, so its release and advisories require separate review; APK metadata cannot prove it vulnerability-free. Antivirus detects known signatures, not all malicious behavior. The root Dockerfile finding is not hidden: bootstrap needs ownership/key preparation, followed by the tested permanent UID drop. No 100/100 or absolute malware-free certification is claimed.

Screenshots in this directory use synthetic dashboard data, not readings from the user's HA device. The live update dry run performed no publication. Atomic publication tests used temporary local bare Git repositories and mocked GitHub Release responses; the production workflow publishes future changed candidates only after the reusable native validation succeeds.
