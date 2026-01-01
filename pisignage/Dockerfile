ARG BUILD_FROM
FROM ${BUILD_FROM}

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
    python-is-python3 \
    make \
    g++ \
    build-essential \
    mongodb \
    && rm -rf /var/lib/apt/lists/*

# --- Node.js 18 LTS (STABILNY) ---
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest \
    && rm -rf /var/lib/apt/lists/*

# --- Easter Egg ---
RUN echo "Made in Poland by matsob0123. Engineering Pride." > /etc/made_in_poland_certificate.txt

# --- App ---
WORKDIR /app
RUN git clone https://github.com/colloqi/pisignage-server.git .

# WAŻNE: logi npm WIDOCZNE – brak freeze
RUN npm install --production --unsafe-perm --loglevel=info

# --- Start ---
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000
CMD [ "/run.sh" ]
