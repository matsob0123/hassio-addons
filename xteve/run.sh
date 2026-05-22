#!/bin/sh
set -e

echo "[xTeVe] Creating data directories..."
mkdir -p /data/conf /data/temp

echo "[xTeVe] Starting xTeVe 2.5.3 on port 34400..."
echo "[xTeVe] Web UI: http://<your-ha-ip>:34400/web"
echo "[xTeVe] Config stored in: /data/conf"

exec /home/xteve/xteve -config=/data/conf/ -port=34400 -branch=main
