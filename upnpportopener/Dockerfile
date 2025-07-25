ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest

FROM $BUILD_FROM

RUN apk add --no-cache build-base python3-dev py3-pip miniupnpc-dev

# utwórz i aktywuj wirtualne środowisko, zainstaluj pakiet Pythonowy
RUN python3 -m venv /venv \
  && /venv/bin/pip install --no-cache-dir miniupnpc

COPY run.py /run.py

CMD ["/venv/bin/python", "/run.py"]
