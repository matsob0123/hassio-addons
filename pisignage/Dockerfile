ARG BUILD_FROM
FROM ${BUILD_FROM}

ENV LANG C.UTF-8

RUN apk add --no-cache \
    nodejs \
    npm \
    mongodb \
    mongodb-tools \
    bash \
    python3 \
    make \
    g++ \
    git

WORKDIR /opt/pisignage
COPY app/ /opt/pisignage/
RUN npm install --omit=dev

RUN mkdir -p /data/db /data/pisignage

COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000

CMD ["/run.sh"]
