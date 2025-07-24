FROM eclipse-temurin:21-jdk

# Install tools
RUN apt-get update && apt-get install -y jq unzip bash && rm -rf /var/lib/apt/lists/*

# Copy the startup script
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Optional: Include example.jar (can be overridden by volume in /share)
COPY example.jar /opt/app/example.jar

WORKDIR /opt

CMD ["/run.sh"]
