ARG BUILD_FROM
FROM $BUILD_FROM

# Install dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    git \
    ffmpeg \
    imagemagick \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Clone piSignage server repository
RUN git clone https://github.com/colloqi/pisignage-server.git /app

# Install Node.js dependencies
RUN npm install --production

# Create media directories
RUN mkdir -p /data/media /data/media/_thumbnails /data/logs

# Copy rootfs
COPY rootfs /

# Make run script executable
RUN chmod a+x /etc/services.d/pisignage/run /etc/services.d/pisignage/finish

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Labels
LABEL \
    io.hass.name="piSignage Server" \
    io.hass.description="Digital signage server for Raspberry Pi displays" \
    io.hass.type="addon" \
    io.hass.version="1.0.0"