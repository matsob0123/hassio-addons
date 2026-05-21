FROM ghcr.io/iassis/spotiflac:latest

RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
