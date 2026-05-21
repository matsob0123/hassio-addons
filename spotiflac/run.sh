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
echo "[SpotiFLAC] Web UI available at https://<your-ha-ip>:3001"
echo "[SpotiFLAC] Tip: In the app settings, set the download folder to /share/spotiflac"

mkdir -p /share/spotiflac

exec /init
