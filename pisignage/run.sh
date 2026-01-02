#!/usr/bin/with-contenv bash
set -e

CONFIG_PATH=/data/options.json

LOG_LEVEL=$(jq -r '.log_level' $CONFIG_PATH)
MONGO_DB_PATH=$(jq -r '.mongo_db_path' $CONFIG_PATH)
NODE_ENV=$(jq -r '.node_env' $CONFIG_PATH)

export NODE_ENV=${NODE_ENV}

echo "[piSignage] Starting MongoDB at ${MONGO_DB_PATH}..."

mongod \
  --dbpath ${MONGO_DB_PATH} \
  --bind_ip 127.0.0.1 \
  --nojournal \
  --fork \
  --logpath /tmp/mongodb.log

echo "[piSignage] Waiting for MongoDB..."
sleep 5

echo "[piSignage] Starting piSignage Server (NODE_ENV=${NODE_ENV})"

cd /opt/pisignage
exec node server.js
