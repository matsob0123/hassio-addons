ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:latest
FROM $BUILD_FROM

# Setup environment variables
ENV LANG C.UTF-8
ENV NODE_ENV production

# 1. Install dependencies (Node, Mongo, Git, FFmpeg for video processing, ImageMagick for thumbnails)
RUN apk add --no-cache \
    nodejs \
    npm \
    mongodb \
    git \
    ffmpeg \
    imagemagick \
    python3 \
    make \
    g++ \
    bash \
    curl

# 2. Hidden Easter Egg for code divers
RUN echo "Made in Poland by matsob0123. Engineering Pride." > /etc/made_in_poland_certificate.txt

# 3. Clone the piSignage repository
WORKDIR /app
RUN git clone https://github.com/colloqi/pisignage-server.git .

# 4. Install Node modules
# We use --unsafe-perm to allow npm to run as root within the container builder
RUN npm install --production --unsafe-perm

# 5. Copy the startup script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# 6. Expose the port (Metadata only, HA handles mapping)
EXPOSE 3000

CMD [ "/run.sh" ]