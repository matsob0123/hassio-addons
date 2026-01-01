FROM ghcr.io/home-assistant/aarch64-base-debian:bookworm

ENV LANG=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

# --- System ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    git \
    ca-certificates \
    ffmpeg \
    imagemagick \
    python3 \
    build-essential \
    mongodb \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# --- App ---
WORKDIR /app
RUN git clone https://github.com/colloqi/pisignage-server.git .

RUN npm install --production --unsafe-perm

# --- Logo (auto) ---
RUN mkdir -p /app/public && \
    convert -size 256x256 xc:black \
      -gravity center \
      -fill white \
      -pointsize 36 \
      -annotate 0 "piSignage\nHA Add-on" \
      /app/public/logo.png

# --- Start ---
COPY run.sh /run.sh
RUN chmod +x /run.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD curl -f http://localhost:3000/api/status || exit 1

EXPOSE 3000
CMD [ "/run.sh" ]
