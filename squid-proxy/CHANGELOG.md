# Changelog

## 1.0.0

- Initial hardened adaptation using verified Squid 7.7 source and Alpine 3.24.
- Admin-only Ingress dashboard PL/EN with local assets and strict CSP.
- 37 validated settings: multiple bcrypt accounts, networks/domains, DNS,
  HTTP/HTTPS listeners, three cache modes, resource limits and custom env.
- Fail-closed startup, mandatory control-plane destination protection,
  permanent UID 10001 drop and custom AppArmor profile.
- Native amd64/aarch64 Docker integration and AppArmor regression tests.
- Fortnightly manifest-verified Alpine updates with version bumps, atomic publication,
  dry run and 13 updater regression tests; publication requires native validation.
- Experimental pending real HA OS/Supervisor acceptance testing.
