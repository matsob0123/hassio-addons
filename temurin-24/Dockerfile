FROM eclipse-temurin:24-jdk

RUN apt-get update && apt-get install -y jq bash && rm -rf /var/lib/apt/lists/*

COPY run.sh /run.sh
RUN chmod +x /run.sh

COPY example.jar /opt/example.jar


WORKDIR /opt

CMD ["/run.sh"]
