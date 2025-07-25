FROM alpine:3.18

# Pobierz i rozpakuj s6-overlay
ADD https://github.com/just-containers/s6-overlay/releases/download/v2.2.0.3/s6-overlay-amd64.tar.gz /tmp/
RUN tar xzf /tmp/s6-overlay-amd64.tar.gz -C / && rm /tmp/s6-overlay-amd64.tar.gz

# Instalacja pakietów i pip
RUN apk add --no-cache \
    python3 \
    py3-pip \
    miniupnpc-dev \
    build-base \
    python3-dev \
    bash

# Kopiowanie requirements i instalacja pakietów python
COPY requirements.txt /tmp/
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# Kopiowanie skryptu Pythona
COPY run.py /usr/local/bin/run.py

# ENTRYPOINT do s6-init
ENTRYPOINT ["/init"]

# CMD uruchamia skrypt python i kontener zakończy działanie po skrypcie
CMD ["python3", "/usr/local/bin/run.py"]
