#!/usr/bin/with-contenv bash
set -e

CONFIG_PATH=/data/options.json

# Pobierz zmienne z options.json
LOG_LEVEL=$(jq -r '.log_level' $CONFIG_PATH)
MONGO_URI=$(jq -r '.mongo_uri' $CONFIG_PATH)
NODE_ENV=$(jq -r '.node_env' $CONFIG_PATH)
MEDIA_STORAGE=$(jq -r '.media_storage' $CONFIG_PATH)

export NODE_ENV=${NODE_ENV}
export MONGO_URI=${MONGO_URI}

echo "[piSignage] Starting piSignage Server..."
echo "[piSignage] LOG_LEVEL=${LOG_LEVEL}, NODE_ENV=${NODE_ENV}, MONGO_URI=${MONGO_URI}"

cd /opt/pisignage

# Uruchom serwer Node.js
exec node server.js
