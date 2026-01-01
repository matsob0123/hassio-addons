#!/usr/bin/with-contenv bashio

# ==============================================================================
#  piSignage Server Loader (Debian Edition)
#  PORT TO HASSOS BY matsob0123
#  MADE IN POLAND
# ==============================================================================

bashio::log.info "------------------------------------------------"
bashio::log.info "Starting piSignage Server (Debian/RPi5 Fix)"
bashio::log.info "Made in Poland by matsob0123"
bashio::log.info "------------------------------------------------"

# 1. KONFIGURACJA I ZMIENNE
MEDIA_STORAGE=$(bashio::config 'media_storage')
MONGO_PATH=$(bashio::config 'mongo_db_path')

# 2. TRWAŁOŚĆ DANYCH (PERSISTENCE) - MEDIA
if [ "$MEDIA_STORAGE" == "share" ]; then
    bashio::log.info "Using /share/pisignage/media for storage..."
    
    if [ ! -d "/share/pisignage/media" ]; then
        mkdir -p /share/pisignage/media
        chmod 777 /share/pisignage/media
    fi
    
    rm -rf /app/media
    ln -s /share/pisignage/media /app/media
else
    bashio::log.info "Using internal /data storage for media..."
    if [ ! -d "/data/media" ]; then
        mkdir -p /data/media
    fi
    rm -rf /app/media
    ln -s /data/media /app/media
fi

# 3. TRWAŁOŚĆ DANYCH - BAZA DANYCH
bashio::log.info "Setting up MongoDB persistence..."
if [ ! -d "$MONGO_PATH" ]; then
    mkdir -p "$MONGO_PATH"
fi
# Upewniamy się, że użytkownik mongodb ma dostęp do folderu (w Debianie to ważne)
chown -R mongodb:mongodb "$MONGO_PATH" || true

# 4. TRWAŁOŚĆ DANYCH - CONFIG
if [ ! -d "/data/config" ]; then
    mkdir -p /data/config
    if [ -d "/app/config" ]; then
        cp -r /app/config/* /data/config/
    fi
fi
rm -rf /app/config
ln -s /data/config /app/config

# 5. URUCHOMIENIE MONGODB (Wersja Debian/Community)
bashio::log.info "Starting MongoDB 7.0..."
# Usuwamy stary plik lock jeśli istnieje (częsty błąd po restarcie prądu)
rm -f "$MONGO_PATH/mongod.lock"

# Uruchamiamy mongod w tle jako proces
mongod --fork --logpath /var/log/mongodb.log --dbpath "$MONGO_PATH" --bind_ip_all

# Czekamy na wstanie bazy
bashio::log.info "Waiting for MongoDB to initialize..."
sleep 5

if pgrep mongod > /dev/null; then
    bashio::log.info "MongoDB started successfully."
else
    bashio::log.error "MongoDB failed to start! Checking logs..."
    if [ -f /var/log/mongodb.log ]; then
        cat /var/log/mongodb.log
    fi
    exit 1
fi

# 6. URUCHOMIENIE PISIGNAGE
bashio::log.info "Starting Node.js Server..."
bashio::log.info "PORT TO HASSOS BY matsob0123 - READY."

export PORT=3000
cd /app && npm start