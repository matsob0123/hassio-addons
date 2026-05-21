FROM ghcr.io/iassis/spotiflac:latest

RUN apt-get update && apt-get install -y jq nginx && rm -rf /var/lib/apt/lists/*

COPY nginx.conf /etc/nginx/nginx.conf
COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
