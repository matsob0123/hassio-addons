# Changelog

## 2.5.3.3 (current)
- **FFmpeg** bundled — enables stream re-streaming, remuxing and buffering
- **SSDP** enabled via `host_network: true` — Plex DVR auto-discovers xTeVe
- **Watchdog** added — HA restarts the add-on if the web UI stops responding
- **Username / password** options — credentials written to xTeVe config on first run
- **Log level** option (`info` / `debug`)
- Removed ingress — direct port access only (`http://<ha-ip>:34400/web`)
- Updated README and DOCS

## 2.5.3.2
- Configurable TZ, PUID, PGID options
- Ingress opened directly at `/web`
- Added sidebar icon and panel title
- Added README.md and DOCS.md

## 2.5.3
- Built locally from `senexcrenshaw/xteve:2.5.3` — no external registry
- Ingress support, port 34400 exposed
- Removed all alexbelgium infrastructure