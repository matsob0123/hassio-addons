ARG BUILD_FROM=python:3.11-slim

FROM $BUILD_FROM

# Instalacja miniupnpc i build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libminiupnpc-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Instalacja miniupnpc Python package
RUN pip3 install --no-cache-dir miniupnpc

COPY run.py /run.py

CMD ["python3", "/run.py"]
