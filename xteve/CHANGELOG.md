# Changelog

## 2.5.3.2
- Added configurable options: `TZ` (default `Europe/Warsaw`), `PUID`, `PGID`
- Ingress now opens directly at `/web` (no extra click needed)
- Added `README.md` and `DOCS.md`
- Added sidebar icon (`mdi:television-play`) and panel title
- Dockerfile installs `jq` to read HA options at startup
- Startup script sets timezone, ownership of data dirs
