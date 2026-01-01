ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:latest
FROM $BUILD_FROM

# Instalacja zależności: Node.js, MongoDB i narzędzia pomocnicze
RUN apk add --no-cache \
    nodejs \
    npm \
    mongodb \
    git \
    ffmpeg

# Pobieranie kodu piSignage
WORKDIR /app
RUN git clone https://github.com/colloqi/pisignage-server.git .

# Instalacja modułów NPM
RUN npm install --production

# Kopiowanie skryptu startowego
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]