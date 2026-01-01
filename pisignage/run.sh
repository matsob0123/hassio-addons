#!/usr/bin/with-contenv bashio

# ==============================================================================
#  piSignage Server Loader for Home Assistant OS
#  PORT TO HASSOS BY matsob0123
#  Port is MADE IN POLAND
# ==============================================================================

bashio::log.info "------------------------------------------------"
bashio::log.info "Starting piSignage Server (Port by matsob0123)"
bashio::log.info "Port was Made in Poland. Initialization started."
bashio::log.info "------------------------------------------------"

# 1. KONFIGURACJA I ZMIENNE
MEDIA_STORAGE=$(bashio::config 'media_storage')
MONGO_PATH=$(bashio::config 'mongo_db_path')

# 2. TRWAŁOŚĆ DANYCH (PERSISTENCE) - MEDIA
# Jeśli użytkownik wybrał 'share', pliki będą widoczne w Sambie w folderze /share/pisignage
if [ "$MEDIA_STORAGE" == "share" ]; then
    bashio::log.info "Setting up media storage in /share/pisignage (Accessible via SMB)..."
    
    if [ ! -d "/share/pisignage/media" ]; then
        mkdir -p /share/pisignage/media
        chmod 777 /share/pisignage/media
    fi
    
    # Usuwamy oryginalny folder media i tworzymy link symboliczny
    rm -rf /app/media
    ln -s /share/pisignage/media /app/media
    bashio::log.info "Media linked to /share/pisignage/media successfully."
else
    # Fallback to internal data persistence
    bashio::log.info "Using internal /data storage for media..."
    if [ ! -d "/data/media" ]; then
        mkdir -p /data/media
    fi
    rm -rf /app/media
    ln -s /data/media /app/media
fi

# 3. TRWAŁOŚĆ DANYCH (PERSISTENCE) - BAZA DANYCH
bashio::log.info "Setting up MongoDB persistence..."
if [ ! -d "$MONGO_PATH" ]; then
    mkdir -p "$MONGO_PATH"
fi

# 4. TRWAŁOŚĆ DANYCH - KONFIGURACJA SERWERA
# Przenosimy config serwera do /data, aby zachować ustawienia
if [ ! -d "/data/config" ]; then
    mkdir -p /data/config
    # Kopiujemy domyślny config jeśli istnieje
    if [ -d "/app/config" ]; then
        cp -r /app/config/* /data/config/
    fi
fi
rm -rf /app/config
ln -s /data/config /app/config

# 5. URUCHOMIENIE MONGODB
bashio::log.info "Starting MongoDB..."
mongod --fork --logpath /var/log/mongodb.log --dbpath "$MONGO_PATH" --bind_ip_all

# Czekamy chwilę aż baza wstanie
sleep 5

# Sprawdzenie czy baza działa
if pgrep mongod > /dev/null; then
    bashio::log.info "MongoDB started successfully."
else
    bashio::log.error "MongoDB failed to start! Check logs."
    exit 1
fi

# 6. OPCJONALNIE: RESET HASŁA
# Jeśli użytkownik wpisał coś w polu resetu hasła w configu
RESET_PASS=$(bashio::config 'admin_password_reset')
if [ ! -z "$RESET_PASS" ]; then
    bashio::log.warning "Password reset requested. This feature requires manual DB injection implementation in future versions."
    bashio::log.warning "For now, please use the default credentials or change via UI."
fi

# 7. URUCHOMIENIE PISIGNAGE
bashio::log.info "Starting Node.js Server..."
bashio::log.info "PORT TO HASSOS BY matsob0123 - READY TO SERVE."

# Ustawienie portu z env (choć pisignage domyślnie używa 3000)
export PORT=3000

cd /app && npm start