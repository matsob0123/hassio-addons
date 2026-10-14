# Security review and provenance

Review date: 2026-10-14. Scope: upstream addon commit `fcd2e767d6de4475af472f0be955f9365e621d0f`, the adaptation, build recipe and official Squid7.7 source provenance. This is source review and automated testing, not certification or a guarantee that future dependencies are safe.

No intentional malware behavior was identified in the reviewed addon files. Risks identified upstream included permissive source-network defaults, a remote CDN script in the privileged dashboard, insufficiently constrained configuration interpolation, password handling through command arguments, overly broad certificate permissions, and TLS fallback paths. The adaptation replaces these paths with typed validation, local static assets, credential stdin, private files and fail-closed TLS. It does not inherit the old dashboard/scripts.

Squid is an explicit forward proxy and will create outbound connections on clients' behalf. That activity is the intended function. This application does not install persistence outside HA, change host networking, open router ports, scan the LAN, mine cryptocurrency, collect telemetry or send data to an author endpoint. Its build downloads official source and signed Alpine packages. Normal runtime traffic comprises requested destinations, configured DNS and proxy/client responses. Certificate generation runs locally. No interception CA or TLS decryption is implemented.

## Boundaries

- Default source ACL and authentication both apply. Public-source configuration forces TLS-only authentication.
- Loopback, link-local/cloud metadata, multicast and the Supervisor subnet are denied regardless of private-destination opt-in. Broader LAN access is opt-in.
- The dashboard requires the actual Supervisor peer, ignores spoofed forwarding headers, exposes a fixed status whitelist and has no configuration/file-write endpoint.
- No external browser scripts/fonts, inline JavaScript, eval or runtime installation of Python packages. Python standard library only; the image contains distro-maintained runtime tools.
- Source SHA256 and base manifest digest are pinned. `apk upgrade` receives current signed security fixes during build, so package versions can change on rebuild. This is intentional and means the entire image is not byte-reproducible.
- Root is discarded before opening listeners; the AppArmor profile also constrains bootstrap. No elevated HA permissions, host mounts except read-only SSL, or API access.
- Raw Squid directives are not configurable: unrestricted directives could undo safety controls or execute helpers. Custom env cannot replace protected loader, path, Python or HA variables.

## Limitations and maintenance

Administrator-supplied options and backups contain secrets. Basic authentication over HTTP is readable on the client-to-proxy link. TLS must be trusted and hostname-verified. Read access to the running container or HA backups can reveal credentials. The dashboard is intended only behind HA Ingress; do not manually expose8099 or attach untrusted containers to Supervisor's network.

Domain rules are not content inspection or a network firewall. DNS rebinding, shared hosting, application bypass and future Squid vulnerabilities remain reasons to segment networks. Security testing uses disposable origins and DNS, never third-party target scanning. The profile intentionally permits outbound TCP/UDP because forwarding and DNS require it; restrict egress further at your router if needed.

The Home Assistant security badge has a maximum of6, not100. The manifest avoids score deductions and includes Ingress plus a custom profile. Supervisor's actual badge and real-device startup still require HA installation. amd64 and aarch64 are the only advertised architectures; 32-bit support is not claimed.

Native-image integration tests exercise both architectures, including AppArmor enforce mode and a negative file-access probe. The workflow also runs every14 days to detect build/runtime regressions and refresh security evidence. Scheduled runs do not silently upgrade installed applications or alter a release version. Dependency/security reports can require manual triage and updates. See TEST_REPORT.md for measured results, including any remaining unverified checks.

Primary references: [HA configuration](https://developers.home-assistant.io/docs/apps/configuration/), [HA security](https://developers.home-assistant.io/docs/apps/security/), [HA security rating](https://developers.home-assistant.io/docs/apps/presentation/), [Squid releases](https://github.com/squid-cache/squid/releases), [Squid configuration](https://www.squid-cache.org/Doc/config/).
