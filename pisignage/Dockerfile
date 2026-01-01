ARG BUILD_FROM
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8 \
    NODE_ENV=production

# --- System (ALPINE!) ---
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
    mongodb \
    mongodb-tools \
    nodejs \
    npm \
    tini

# --- App ---
WORKDIR /app
RUN git clone https://github.com/colloqi/pisignage-server.git .

RUN npm install --production --unsafe-perm

# --- Logo ---
COPY logo.png /app/public/logo.png

# --- Scripts ---
COPY run.sh /run.sh
RUN chmod +x /run.sh

# --- Healthcheck ---
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD curl -f http://localhost:3000/api/status || exit 1

EXPOSE 3000
CMD [ "/run.sh" ]
