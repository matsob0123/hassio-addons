#!/usr/bin/with-contenv bashio
set -e

bashio::log.info "========================================"
bashio::log.info "piSignage Server – HA Add-on (Debian)"
bashio::log.info "Author: matsob0123"
bashio::log.info "========================================"

MONGO_PATH="$(bashio::config mongo_db_path)"
MEDIA_STORAGE="$(bashio::config media_storage)"
NODE_ENV="$(bashio::config node_env)"

export NODE_ENV
export PORT=3000

# --- MongoDB ---
mkdir -p "$MONGO_PATH"
rm -f "$MONGO_PATH/mongod.lock"

bashio::log.info "Starting MongoDB..."
mongod \
  --dbpath "$MONGO_PATH" \
  --bind_ip_all \
  --fork \
  --logpath /var/log/mongodb.log

sleep 5

# --- Media ---
rm -rf /app/media
if [ "$MEDIA_STORAGE" = "share" ]; then
  mkdir -p /share/pisignage/media
  ln -s /share/pisignage/media /app/media
else
  mkdir -p /data/media
  ln -s /data/media /app/media
fi

# --- Config ---
mkdir -p /data/config
rm -rf /app/config
ln -s /data/config /app/config

# --- Start ---
bashio::log.info "Starting piSignage Node server..."
cd /app
exec npm start
