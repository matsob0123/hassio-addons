# Bazowy obraz z OpenJDK 21
FROM eclipse-temurin:21-jdk

# Instalacja narzędzi
# Install tools
RUN apt-get update && apt-get install -y jq bash && rm -rf /var/lib/apt/lists/*

# Dodanie skryptu startowego
# Add the startup script
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Domyślny katalog
# Default directory
WORKDIR /opt

CMD ["/run.sh"]
