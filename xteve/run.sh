#!/bin/sh
set -e

ts() { date '+%Y-%m-%d %H:%M:%S'; }

CONFIG=/data/options.json

echo "[$(ts)] [xTeVe] =========================================="
echo "[$(ts)] [xTeVe] Starting xTeVe 2.5.3.3"
echo "[$(ts)] [xTeVe] =========================================="

TZ=$(jq -r        '.TZ        // "Europe/Warsaw"' "${CONFIG}")
PUID=$(jq -r      '.PUID      // "1000"'          "${CONFIG}")
PGID=$(jq -r      '.PGID      // "1000"'          "${CONFIG}")
SSDP=$(jq -r      '.ssdp      // "true"'          "${CONFIG}")
USERNAME=$(jq -r  '.username  // ""'              "${CONFIG}")
PASSWORD=$(jq -r  '.password  // ""'              "${CONFIG}")
LOG_LEVEL=$(jq -r '.log_level // "info"'          "${CONFIG}")

export TZ="${TZ}"

echo "[$(ts)] [xTeVe] TZ        = ${TZ}"
echo "[$(ts)] [xTeVe] PUID/PGID = ${PUID}:${PGID}"
echo "[$(ts)] [xTeVe] SSDP      = ${SSDP}"
echo "[$(ts)] [xTeVe] Log level = ${LOG_LEVEL}"
echo "[$(ts)] [xTeVe] FFmpeg    = $(ffmpeg -version 2>&1 | head -1)"

echo "[$(ts)] [xTeVe] Creating data directories..."
mkdir -p /data/conf /data/temp
chown -R "${PUID}:${PGID}" /data/conf /data/temp

# Write credentials to xTeVe pre-config on first run
SETTINGS_FILE="/data/conf/settings.json"
if [ ! -f "${SETTINGS_FILE}" ] && [ -n "${USERNAME}" ] && [ -n "${PASSWORD}" ]; then
    echo "[$(ts)] [xTeVe] First run — writing credentials to settings..."
    cat > "${SETTINGS_FILE}" <<EOF
{
  "authentication.web":  true,
  "authentication.pms":  false,
  "authentication.m3u":  false,
  "authentication.xml":  false,
  "authentication.api":  false,
  "credentials.user":    "${USERNAME}",
  "credentials.password":"${PASSWORD}"
}
EOF
    chown "${PUID}:${PGID}" "${SETTINGS_FILE}"
fi

if [ -z "${USERNAME}" ] || [ -z "${PASSWORD}" ]; then
    echo "[$(ts)] [xTeVe] Auth disabled (no username/password set)"
fi

echo "[$(ts)] [xTeVe] Web UI: http://<your-ha-ip>:34400/web"
[ "${SSDP}" = "true" ] && echo "[$(ts)] [xTeVe] SSDP broadcast enabled — Plex will auto-discover xTeVe"

exec /home/xteve/xteve \
    -config=/data/conf/ \
    -port=34400 \
    -branch=main
