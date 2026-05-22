#!/bin/sh
set -e

ts() { date '+%Y-%m-%d %H:%M:%S'; }

echo "[$(ts)] [xTeVe] =========================================="
echo "[$(ts)] [xTeVe] Starting xTeVe 2.5.3"
echo "[$(ts)] [xTeVe] =========================================="

echo "[$(ts)] [xTeVe] Creating data directories..."
mkdir -p /data/conf /data/temp

echo "[$(ts)] [xTeVe] Config directory : /data/conf"
echo "[$(ts)] [xTeVe] Web UI port      : 34400"
echo "[$(ts)] [xTeVe] Web UI URL       : http://<your-ha-ip>:34400/web"

exec /home/xteve/xteve -config=/data/conf/ -port=34400 -branch=main
