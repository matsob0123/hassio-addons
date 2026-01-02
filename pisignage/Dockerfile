# =========================================================
# piSignage Server – Home Assistant Add-on
# Based EXACTLY on colloqi logic
# =========================================================

FROM ghcr.io/home-assistant/aarch64-base:latest

ENV LANG=C.UTF-8 \
    NODE_ENV=production \
    MONGO_VERSION=4.2.24 \
    MONGO_DIR=/opt/mongodb

# ---------------------------------------------------------
# System (Alpine)
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
    tar

# ---------------------------------------------------------
# MongoDB (OFFICIAL colloqi way)
# ---------------------------------------------------------
WORKDIR /opt

RUN curl -fL \
    https://fastdl.mongodb.org/linux/mongodb-linux-aarch64-ubuntu1804-${MONGO_VERSION}.tgz \
    -o mongo.tgz \
    && tar -xzf mongo.tgz \
    && mv mongodb-linux-aarch64-ubuntu1804-${MONGO_VERSION} mongodb \
    && rm mongo.tgz

ENV PATH="${MONGO_DIR}/bin:${PATH}"

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
