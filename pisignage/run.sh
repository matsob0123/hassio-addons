#!/usr/bin/with-contenv bashio
set -e

bashio::log.info "========================================"
bashio::log.info "piSignage Server – Home Assistant Add-on"
bashio::log.info "Full Port + Watchdog + Healthcheck"
bashio::log.info "Author: matsob0123"
bashio::log.info "========================================"

# --- Config ---
LOG_LEVEL="$(bashio::config log_level)"
MONGO_PATH="$(bashio::config mongo_db_path)"
MEDIA_STORAGE="$(bashio::config media_storage)"
NODE_ENV="$(bashio::config node_env)"

export NODE_ENV
export PORT=3000

# --- Mongo ---
mkdir -p "$MONGO_PATH"
chown -R mongodb:mongodb "$MONGO_PATH"

mkdir -p /var/log/mongodb
chown -R mongodb:mongodb /var/log/mongodb

rm -f "$MONGO_PATH/mongod.lock"

bashio::log.info "Starting MongoDB..."
mongod \
  --dbpath "$MONGO_PATH" \
  --logpath /var/log/mongodb/mongod.log \
  --bind_ip_all \
  --fork

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

# --- Config persistence ---
mkdir -p /data/config
rm -rf /app/config
ln -s /data/config /app/config

# --- Start App ---
bashio::log.info "Starting Node.js server..."
cd /app
exec npm start
