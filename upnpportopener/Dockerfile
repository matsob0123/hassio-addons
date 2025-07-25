# Wersja bazowa
FROM alpine:3.18

# Pobierz i rozpakuj s6-overlay (wersja amd64)
ADD https://github.com/just-containers/s6-overlay/releases/download/v2.2.0.3/s6-overlay-amd64.tar.gz /tmp/

RUN tar xzf /tmp/s6-overlay-amd64.tar.gz -C / \
    && rm /tmp/s6-overlay-amd64.tar.gz

# Instalacja pakietów systemowych i python z miniupnpc
RUN apk add --no-cache \
    build-base \
    python3 \
    python3-dev \
    py3-pip \
    miniupnpc-dev \
    bash \
    && pip3 install --no-cache-dir miniupnpc

# Kopiowanie plików s6 service (jeśli masz jakieś) do katalogu usług s6 (opcjonalnie)
# COPY ./services/ /etc/services.d/

# Ustaw s6-overlay jako entrypoint - musi być PID 1
ENTRYPOINT ["/init"]

# Domyślna komenda, możesz zmienić na swój program
CMD ["bash"]
