#!/bin/sh
set -e

ts() { date '+%Y-%m-%d %H:%M:%S'; }

CONFIG=/data/options.json

echo "[$(ts)] [xTeVe] =========================================="
echo "[$(ts)] [xTeVe] Starting xTeVe 2.5.3.2"
echo "[$(ts)] [xTeVe] =========================================="

TZ=$(jq -r '.TZ // "Europe/Warsaw"' "${CONFIG}")
PUID=$(jq -r '.PUID // "1000"' "${CONFIG}")
PGID=$(jq -r '.PGID // "1000"' "${CONFIG}")

export TZ="${TZ}"

echo "[$(ts)] [xTeVe] TZ   = ${TZ}"
echo "[$(ts)] [xTeVe] PUID = ${PUID}  PGID = ${PGID}"

echo "[$(ts)] [xTeVe] Creating data directories..."
mkdir -p /data/conf /data/temp

echo "[$(ts)] [xTeVe] Setting ownership -> ${PUID}:${PGID}"
chown -R "${PUID}:${PGID}" /data/conf /data/temp

echo "[$(ts)] [xTeVe] Web UI : http://<your-ha-ip>:34400/web"
echo "[$(ts)] [xTeVe] Ingress: available via HA sidebar (xTeVe)"

exec /home/xteve/xteve -config=/data/conf/ -port=34400 -branch=main
