ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest

FROM $BUILD_FROM

# Instalacja wymaganych pakietów i miniupnpc
RUN apk add --no-cache \
    build-base \
    python3-dev \
    py3-pip \
    miniupnpc-dev \
    && pip3 install --no-cache-dir miniupnpc

COPY run.py /run.py

CMD ["python3", "/run.py"]
