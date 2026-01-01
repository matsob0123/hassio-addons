# =========================================================
# piSignage Server - Home Assistant Add-on
# Debian 12 (bookworm) / aarch64
# =========================================================

ARG BUILD_FROM
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    NODE_ENV=production

# ---------------------------------------------------------
# System packages
# ---------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    git \
    ca-certificates \
    ffmpeg \
    imagemagick \
    python3 \
    build-essential \
    gnupg \
    lsb-release \
    tini \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# MongoDB official repo
# ---------------------------------------------------------
RUN curl -fsSL https://pgp.mongodb.com/server-6.0.asc | \
    gpg --dearmor -o /usr/share/keyrings/mongodb-server.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/mongodb-server.gpg] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/6.0 main" \
    > /etc/apt/sources.list.d/mongodb-org.list

RUN apt-get update && apt-get install -y --no-install-recommends \
    mongodb-org \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# MongoDB dirs
# ---------------------------------------------------------
RUN mkdir -p /data/db /data/configdb

# ---------------------------------------------------------
# App
# ---------------------------------------------------------
WORKDIR /opt/pisignage

RUN git clone https://github.com/colloqi/pisignage-server.git .

RUN npm install --omit=dev

# ---------------------------------------------------------
# run.sh
# ---------------------------------------------------------
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000 27017

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/run.sh"]
