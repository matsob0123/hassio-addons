#!/usr/bin/with-contenv bashio
set -e

bashio::log.info "========================================"
bashio::log.info "Starting piSignage Server"
bashio::log.info "RPi5 | Home Assistant Add-on"
bashio::log.info "Ported by matsob0123"
bashio::log.info "========================================"

# --- Mongo paths ---
MONGO_PATH="$(bashio::config 'mongo_db_path')"
mkdir -p "$MONGO_PATH"
chown -R mongodb:mongodb "$MONGO_PATH"

mkdir -p /var/log/mongodb
chown -R mongodb:mongodb /var/log/mongodb

# --- Media ---
MEDIA_STORAGE="$(bashio::config 'media_storage')"

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

# --- MongoDB ---
bashio::log.info "Starting MongoDB..."
rm -f "$MONGO_PATH/mongod.lock"

mongod \
  --dbpath "$MONGO_PATH" \
  --logpath /var/log/mongodb/mongod.log \
  --bind_ip_all \
  --fork

sleep 5

# --- App ---
bashio::log.info "Starting piSignage Node server..."
export PORT=3000
cd /app
exec npm start
