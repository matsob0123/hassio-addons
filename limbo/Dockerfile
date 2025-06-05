FROM openjdk:17-jdk-slim

RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*

COPY run.sh /run.sh
RUN chmod +x /run.sh

ENTRYPOINT ["/usr/bin/tini", "-s", "--"]
CMD ["/run.sh"]
