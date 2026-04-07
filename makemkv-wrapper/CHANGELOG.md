# Changelog — MakeMKV Wrapper

All notable changes to this add-on are documented here.

---

## [2.0.0] — 2026-04-07

### Ported by matsob0123

#### Added
- Full `config.yaml` schema with 20+ configurable options
- AppArmor profile (`apparmor.txt`) for container hardening
- `build.yaml` for the Home Assistant multi-arch build toolchain
- `rootfs/etc/cont-init.d/10-makemkv-options.sh` — translates HA
  options.json into jlesage environment variables at runtime
- `rootfs/etc/services.d/makemkv/{run,finish}` — proper s6 service
  wrappers that integrate with HA watchdog
- `translations/en.yaml` — rich UI labels for every option in the
  Home Assistant configuration panel
- `DOCS.md` — detailed per-option documentation shown in HA
- Auto disc ripper: full option set (interval, min title length,
  Blu-ray mode, parallel rip, force unique dir)
- Timezone propagation (log timestamps + scheduler)
- CPU niceness control
- CJK font toggle
- Dark mode toggle
- VNC password support
- PUID/PGID/umask controls
- Log level control (info/debug/trace)
- Configurable output path

#### Changed
- Bumped version from 1.1.2 → 2.0.0
- Dockerfile: added `bash`, `jq`, `tzdata` for option processing
- Dockerfile: proper OCI and HA labels with `BUILD_VERSION` injection

#### Fixed
- ingress_stream added so the noVNC websocket works reliably
- `init: false` kept (jlesage uses its own s6 init)
- `privileged` scope narrowed to only `SYS_ADMIN` + `DAC_READ_SEARCH`

---

## [1.1.2] — original (hfbauman)

- Initial minimal wrap of jlesage/docker-makemkv
- Ingress on port 5800
- Single device `/dev/sr0`
