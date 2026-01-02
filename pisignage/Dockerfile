# Home Assistant Base
ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:latest
FROM ${BUILD_FROM}

# Metadane
LABEL io.hass.name="piSignage Server"
LABEL io.hass.description="Professional Digital Signage – Full HA Add-on Port"
LABEL io.hass.arch="aarch64"
LABEL io.hass.type="addon"
LABEL io.hass.version="3.0.6"
LABEL io.hass.url="https://github.com/colloqi/pisignage-server"

# Zainstaluj tylko Node.js i wymagane narzędzia
RUN apk add --no-cache \
    nodejs \
    npm \
    bash \
    python3 \
    make \
    g++

# Utwórz folder dla aplikacji
WORKDIR /opt/pisignage

# Skopiuj pliki lokalne
COPY package.json package.json
COPY run.sh run.sh
COPY config.yaml config.yaml
# server.js i node_modules mogą być kopiowane lub zainstalowane przez npm install

# Instalacja zależności Node.js
RUN npm install --production

# Skrypt startowy
ENTRYPOINT ["/run.sh"]
