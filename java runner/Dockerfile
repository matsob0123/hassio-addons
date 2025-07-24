# Bazowy obraz z Ubuntu, aby mieć apt do instalacji Javy
FROM ubuntu:22.04

# Ustawienie zmiennych środowiskowych, aby apt-get nie pytał o interakcję
ENV DEBIAN_FRONTEND=noninteractive

# Instalacja narzędzi: wget (do pobierania), apt-transport-https (do repozytoriów HTTPS),
# ca-certificates (do weryfikacji certyfikatów), gnupg (do kluczy GPG), jq (do parsowania JSON), bash
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    wget \
    apt-transport-https \
    ca-certificates \
    gnupg \
    jq \
    bash \
    openjdk-21-jdk-headless \ # Zainstalujemy domyślnie jedną wersję, resztę dynamicznie
    && rm -rf /var/lib/apt/lists/*

# Dodanie skryptu startowego
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Domyślny katalog
WORKDIR /opt

CMD ["/run.sh"]