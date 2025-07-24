# Bazowy obraz z OpenJDK, wersja dostarczana jako build-arg
ARG JAVA_VERSION=21
FROM eclipse-temurin:${JAVA_VERSION}-jdk

# Instalacja narzędzi
RUN apt-get update && apt-get install -y jq bash && rm -rf /var/lib/apt/lists/*

# Dodanie skryptu startowego
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Domyślny katalog
WORKDIR /opt

CMD ["/run.sh"]