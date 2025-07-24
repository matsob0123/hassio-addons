# Use Temurin JDK 22 as base
FROM eclipse-temurin:22-jdk

# Install tools
RUN apt-get update && apt-get install -y jq bash && rm -rf /var/lib/apt/lists/*

# Add example server jar (replace with real file)
COPY example.jar /opt/example.jar

# Add run script
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Set default workdir
WORKDIR /opt

CMD ["/run.sh"]
