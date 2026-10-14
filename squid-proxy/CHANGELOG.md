# Changelog

## 1.0.0

- Initial hardened adaptation using verified Squid7.7 source and Alpine3.24.
- Admin-only Ingress dashboard PL/EN with local assets and strict CSP.
- 37 validated settings: multiple bcrypt accounts, networks/domains, DNS,
  HTTP/HTTPS listeners, three cache modes, resource limits and custom env.
- Fail-closed startup, mandatory control-plane destination protection,
  permanent UID10001 drop and custom AppArmor profile.
- Native amd64/aarch64 Docker integration and AppArmor regression tests.
- Experimental pending real HA OS/Supervisor acceptance testing.
