# Base image with OpenJDK 21
FROM eclipse-temurin:21-jdk

# Install tools
RUN apt-get update && apt-get install -y jq bash && rm -rf /var/lib/apt/lists/*

# Add the startup script
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Default working directory
WORKDIR /opt

CMD ["/run.sh"]
