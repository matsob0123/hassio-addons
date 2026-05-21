#!/bin/bash
set -e

ts() { date '+%Y-%m-%d %H:%M:%S'; }

CONFIG=/data/options.json

echo "[$(ts)] [SpotiFLAC] =========================================="
echo "[$(ts)] [SpotiFLAC] Starting add-on v1.0.5"
echo "[$(ts)] [SpotiFLAC] =========================================="

TZ=$(jq -r '.TZ // "Europe/Warsaw"' "${CONFIG}")
PUID=$(jq -r '.PUID // "1000"' "${CONFIG}")
PGID=$(jq -r '.PGID // "1000"' "${CONFIG}")

export TZ="${TZ}"
export PUID="${PUID}"
export PGID="${PGID}"
export HOME=/data

echo "[$(ts)] [SpotiFLAC] TZ=${TZ}  PUID=${PUID}  PGID=${PGID}"
echo "[$(ts)] [SpotiFLAC] HOME set to /data"

echo "[$(ts)] [SpotiFLAC] Creating app directories..."
mkdir -p /data/.spotiflac /data/downloads /tmp/nginx_client_body

echo "[$(ts)] [SpotiFLAC] Setting ownership on /data/.spotiflac and /data/downloads -> ${PUID}:${PGID}"
chown -R "${PUID}:${PGID}" /data/.spotiflac /data/downloads

echo "[$(ts)] [SpotiFLAC] Starting nginx ingress proxy on port 8099..."
nginx -c /etc/nginx/nginx.conf &
NGINX_PID=$!
echo "[$(ts)] [SpotiFLAC] nginx started (PID ${NGINX_PID})"

echo "[$(ts)] [SpotiFLAC] Handing off to container init..."
exec /init
