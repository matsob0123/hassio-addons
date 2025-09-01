#!/usr/bin/with-contenv bashio

# /config/addons/makemkv_builder/run.sh

# Tworzenie potrzebnych katalogów
OUTPUT_DIR="/share/makemkv"
HOOKS_DIR="/config/makemkv_hooks" # Miejsce na skrypty użytkownika

bashio::log.info "Checking for required directories..."
mkdir -p "${OUTPUT_DIR}"
mkdir -p "${HOOKS_DIR}"

# Mapowanie folderu z hookami do lokalizacji oczekiwanej przez kontener
ln -sfn "${HOOKS_DIR}" /config/hooks
bashio::log.info "User hooks directory set up at ${HOOKS_DIR}."
bashio::log.info "Place your custom scripts here (e.g., disc_rip_terminated.sh)."

# Odczyt opcji z konfiguracji dodatku i eksport jako zmienne środowiskowe
bashio::log.info "Exporting addon configuration to environment variables..."

export USER_ID=$(bashio::config 'USER_ID')
export GROUP_ID=$(bashio::config 'GROUP_ID')
export UMASK=$(bashio::config 'UMASK')
export TZ=$(bashio::config 'TZ')

if bashio::config.true 'AUTO_DISC_RIPPER'; then export AUTO_DISC_RIPPER=1; else export AUTO_DISC_RIPPER=0; fi
if bashio::config.true 'AUTO_DISC_RIPPER_EJECT'; then export AUTO_DISC_RIPPER_EJECT=1; else export AUTO_DISC_RIPPER_EJECT=0; fi
if bashio::config.true 'AUTO_DISC_RIPPER_PARALLEL_RIP'; then export AUTO_DISC_RIPPER_PARALLEL_RIP=1; else export AUTO_DISC_RIPPER_PARALLEL_RIP=0; fi

export AUTO_DISC_RIPPER_INTERVAL=$(bashio::config 'AUTO_DISC_RIPPER_INTERVAL')
export AUTO_DISC_RIPPER_MIN_TITLE_LENGTH=$(bashio::config 'AUTO_DISC_RIPPER_MIN_TITLE_LENGTH')
export AUTO_DISC_RIPPER_BD_MODE=$(bashio::config 'AUTO_DISC_RIPPER_BD_MODE')
export AUTO_DISC_RIPPER_DVD_MODE=$(bashio::config 'AUTO_DISC_RIPPER_DVD_MODE')

export MAKEMKV_KEY=$(bashio::config 'MAKEMKV_KEY')

if bashio::config.true 'DARK_MODE'; then export DARK_MODE=1; else export DARK_MODE=0; fi
if bashio::config.true 'SECURE_CONNECTION'; then export SECURE_CONNECTION=1; else export SECURE_CONNECTION=0; fi
if bashio::config.true 'WEB_AUTHENTICATION'; then export WEB_AUTHENTICATION=1; else export WEB_AUTHENTICATION=0; fi

if bashio::config.has_value 'VNC_PASSWORD'; then export VNC_PASSWORD=$(bashio::config 'VNC_PASSWORD'); fi
if bashio::config.has_value 'WEB_AUTHENTICATION_USERNAME'; then export WEB_AUTHENTICATION_USERNAME=$(bashio::config 'WEB_AUTHENTICATION_USERNAME'); fi
if bashio::config.has_value 'WEB_AUTHENTICATION_PASSWORD'; then export WEB_AUTHENTICATION_PASSWORD=$(bashio::config 'WEB_AUTHENTICATION_PASSWORD'); fi

if bashio::config.true 'WEB_AUDIO'; then export WEB_AUDIO=1; else export WEB_AUDIO=0; fi
if bashio::config.true 'WEB_FILE_MANAGER'; then export WEB_FILE_MANAGER=1; else export WEB_FILE_MANAGER=0; fi
if bashio::config.true 'ENABLE_CJK_FONT'; then export ENABLE_CJK_FONT=1; else export ENABLE_CJK_FONT=0; fi

export MAKEMKV_OUTPUT_DIR="/share/makemkv"

bashio::log.info "Starting the jlesage/makemkv container logic..."
exec /init