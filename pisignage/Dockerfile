# WYMUSZAMY obraz Debian (ignorujemy to co podsyła Supervisor, bo podsyła Alpine)
FROM ghcr.io/home-assistant/aarch64-base-debian:bookworm

# Konfiguracja środowiska
ENV LANG=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

# 1. Instalacja zależności podstawowych
RUN apt-get update && apt-get install -y --no-install-recommends \
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

# 2. Dodanie repozytorium MongoDB 7.0 (Oficjalne wsparcie ARM64)
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
    && echo "deb [ arch=arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 3. Instalacja MongoDB i Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    mongodb-org \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# 4. Easter Egg
RUN echo "Made in Poland by matsob0123. Engineering Pride." > /etc/made_in_poland_certificate.txt

# 5. Konfiguracja aplikacji
WORKDIR /app
RUN git clone https://github.com/colloqi/pisignage-server.git .

# 6. Instalacja modułów (unsafe-perm pozwala na budowanie jako root w kontenerze)
RUN npm install --production --unsafe-perm

# 7. Skrypty
COPY run.sh /run.sh
RUN chmod a+x /run.sh

EXPOSE 3000
CMD [ "/run.sh" ]