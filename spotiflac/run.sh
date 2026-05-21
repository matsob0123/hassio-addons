#!/bin/bash
set -e

CONFIG=/data/options.json

TZ=$(jq -r '.TZ // "Etc/UTC"' "${CONFIG}")
PUID=$(jq -r '.PUID // "1000"' "${CONFIG}")
PGID=$(jq -r '.PGID // "1000"' "${CONFIG}")

export TZ="${TZ}"
export PUID="${PUID}"
export PGID="${PGID}"
export HOME=/data

echo "[SpotiFLAC] Starting with TZ=${TZ}, PUID=${PUID}, PGID=${PGID}"
echo "[SpotiFLAC] All app data stored in add-on data directory (/data)"
echo "[SpotiFLAC] Direct access: https://<your-ha-ip>:3001"
echo "[SpotiFLAC] HA Ingress: available via the add-on panel in Supervisor"

mkdir -p /data/downloads /data/config /tmp/nginx_client_body

echo "[SpotiFLAC] Starting nginx ingress proxy on port 8099..."
nginx -c /etc/nginx/nginx.conf &

echo "[SpotiFLAC] Starting SpotiFLAC..."
exec /init
