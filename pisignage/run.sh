#!/usr/bin/with-contenv bashio

bashio::log.info "------------------------------------------------"
bashio::log.info "Starting piSignage Server (Debian Hardcoded)"
bashio::log.info "PORT TO HASSOS BY matsob0123"
bashio::log.info "------------------------------------------------"

# --- 1. SETUP FOLDERÓW (Trwałość danych) ---

# Folder bazy danych
MONGO_PATH=$(bashio::config 'mongo_db_path')
if [ ! -d "$MONGO_PATH" ]; then
    mkdir -p "$MONGO_PATH"
fi
# Fix uprawnień dla MongoDB (wymagane w Debianie)
chown -R mongodb:mongodb "$MONGO_PATH"
chown -R mongodb:mongodb /var/log/mongodb || mkdir -p /var/log/mongodb && chown -R mongodb:mongodb /var/log/mongodb

# Folder Mediów (Samba vs Local)
MEDIA_STORAGE=$(bashio::config 'media_storage')
if [ "$MEDIA_STORAGE" == "share" ]; then
    bashio::log.info "Using /share/pisignage/media..."
    mkdir -p /share/pisignage/media
    chmod 777 /share/pisignage/media
    rm -rf /app/media
    ln -s /share/pisignage/media /app/media
else
    bashio::log.info "Using internal /data/media..."
    mkdir -p /data/media
    rm -rf /app/media
    ln -s /data/media /app/media
fi

# Konfiguracja serwera
if [ ! -d "/data/config" ]; then
    mkdir -p /data/config
    [ -d "/app/config" ] && cp -r /app/config/* /data/config/
fi
rm -rf /app/config
ln -s /data/config /app/config


# --- 2. START MONGODB ---

bashio::log.info "Starting MongoDB..."
# Czyszczenie locka po restartach
rm -f "$MONGO_PATH/mongod.lock"

# Uruchamiamy jako użytkownik mongodb (bezpieczeństwo + wymogi Debiana)
# Używamy su-exec (jeśli dostępne) lub setuser, ale w Debianie HA najprościej puścić proces w tle
# --bind_ip_all jest kluczowe dla dostępu kontenera
mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath "$MONGO_PATH" --bind_ip_all --user mongodb

bashio::log.info "Waiting for DB..."
sleep 5

if ! pgrep mongod > /dev/null; then
    bashio::log.error "MongoDB failed! Logs:"
    cat /var/log/mongodb/mongod.log
    exit 1
fi


# --- 3. START APLIKACJI ---

bashio::log.info "Starting Node Server..."
export PORT=3000
cd /app && npm start