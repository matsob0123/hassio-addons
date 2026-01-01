# Używamy bazy Debian (Bookworm) zamiast Alpine, bo Alpine usunęło MongoDB
ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base-debian:bookworm
FROM $BUILD_FROM

# Ustawienia środowiskowe (Nowy format KEY=VALUE)
ENV LANG=C.UTF-8
ENV NODE_ENV=production

# 1. Instalacja zależności systemowych i przygotowanie repozytorium MongoDB
# MongoDB 7.0 wymaga gnupg i curl do pobrania kluczy
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    ca-certificates \
    git \
    ffmpeg \
    imagemagick \
    python3 \
    build-essential \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 2. Dodanie klucza i repozytorium MongoDB 7.0 (oficjalne wsparcie dla ARM64/RPi5)
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
    && echo "deb [ arch=arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 3. Instalacja MongoDB i Node.js
# Debian Bookworm ma w repozytorium dość świeże Node.js i npm
RUN apt-get update && apt-get install -y \
    mongodb-org \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# 4. Easter Egg: Made in Poland
RUN echo "Made in Poland by matsob0123. Engineering Pride." > /etc/made_in_poland_certificate.txt

# 5. Pobranie kodu piSignage
WORKDIR /app
RUN git clone https://github.com/colloqi/pisignage-server.git .

# 6. Instalacja modułów Node (z flagą unsafe-perm dla roota)
RUN npm install --production --unsafe-perm

# 7. Kopiowanie skryptu startowego
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# 8. Wystawienie portu
EXPOSE 3000

CMD [ "/run.sh" ]