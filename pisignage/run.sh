#!/usr/bin/env bash
set -e

echo "[piSignage] Starting MongoDB..."
mongod --dbpath /data/db --bind_ip_all &

echo "[piSignage] Waiting for MongoDB..."
for i in {1..30}; do
    if mongosh --eval "db.runCommand({ ping: 1 })" >/dev/null 2>&1; then
        echo "[piSignage] MongoDB ready"
        break
    fi
    sleep 1
done

echo "[piSignage] Starting piSignage..."
exec npm start
