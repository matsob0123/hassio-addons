FROM ghcr.io/iassis/spotiflac:latest

ARG BUILD_VERSION=dev

LABEL io.hass.version="${BUILD_VERSION}"
LABEL io.hass.type="addon"
LABEL io.hass.arch="amd64"

RUN apt-get update && apt-get install -y jq nginx && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/nginx.conf
COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
