# =========================================================
# piSignage Server – Home Assistant Add-on
# Based on colloqi Dockerfile (OFFICIAL LOGIC)
# =========================================================

FROM ghcr.io/home-assistant/aarch64-base:latest

ENV LANG=C.UTF-8 \
    NODE_ENV=production \
    MONGO_VERSION=4.4.18

# ---------------------------------------------------------
# System (ALPINE)
# ---------------------------------------------------------
RUN apk add --no-cache \
    bash \
    curl \
    git \
    ca-certificates \
    ffmpeg \
    imagemagick \
    python3 \
    make \
    g++ \
    nodejs \
    npm \
    tini \
    tar \
    xz

# ---------------------------------------------------------
# MongoDB (OFFICIAL piSignage WAY)
# ---------------------------------------------------------
WORKDIR /opt

RUN curl -L https://fastdl.mongodb.org/linux/mongodb-linux-aarch64-${MONGO_VERSION}.tgz \
    | tar -xz && \
    mv mongodb-linux-aarch64-${MONGO_VERSION} mongodb

ENV PATH="/opt/mongodb/bin:${PATH}"

RUN mkdir -p /data/db

# ---------------------------------------------------------
# piSignage Server
# ---------------------------------------------------------
WORKDIR /opt/pisignage

RUN git clone https://github.com/colloqi/pisignage-server.git .

RUN npm install --omit=dev

# ---------------------------------------------------------
# run.sh
# ---------------------------------------------------------
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/run.sh"]
