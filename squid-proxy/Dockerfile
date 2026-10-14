# syntax=docker/dockerfile:1
ARG BASE_IMAGE=alpine:3.24@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6
FROM ${BASE_IMAGE} AS build
ARG SQUID_VERSION=7.7
ARG SQUID_SHA256=e3bd613b91b1c498ec2992276063342a85cd6edddd5521294e04f44bc055da9b
RUN apk add --no-cache --upgrade build-base curl xz perl openssl-dev linux-headers libtool
WORKDIR /src
RUN curl -fSL --proto '=https' --proto-redir '=https' --tlsv1.2 \
    "https://github.com/squid-cache/squid/releases/download/SQUID_7_7/squid-${SQUID_VERSION}.tar.xz" -o squid.tar.xz \
    && echo "${SQUID_SHA256}  squid.tar.xz" | sha256sum -c - \
    && tar -xJf squid.tar.xz --strip-components=1 && rm squid.tar.xz
RUN ./configure --prefix=/usr --sysconfdir=/etc/squid --localstatedir=/var \
    --libexecdir=/usr/lib/squid --with-default-user=proxyha --with-openssl \
    --enable-auth-basic=NCSA --disable-auth-negotiate --disable-auth-ntlm \
    --disable-auth-digest --disable-external-acl-helpers --disable-url-rewrite-helpers \
    --disable-storeid-rewrite-helpers --disable-log-daemon-helpers \
    --disable-security-cert-validators --disable-security-cert-generators \
    --disable-icmp --disable-snmp --disable-htcp --disable-wccp --disable-wccpv2 \
    --disable-icap-client --disable-ecap --disable-unlinkd --disable-eui --disable-linux-netfilter \
    --enable-http-violations --disable-strict-error-checking --disable-arch-native \
    --without-libcap --without-gnutls \
    && make -j2 && make DESTDIR=/out install

FROM ${BASE_IMAGE}
ARG BUILD_VERSION=1.0.0
ARG BUILD_ARCH=amd64
RUN apk upgrade --no-cache \
    && apk add --no-cache --upgrade python3 apache2-utils openssl libstdc++ libltdl tzdata \
    && addgroup -g 10001 proxyha \
    && adduser -D -H -u 10001 -G proxyha -s /sbin/nologin proxyha \
    && mkdir -p /data /run/squid-ha
COPY --from=build /out/usr/sbin/squid /usr/sbin/squid
COPY --from=build /out/usr/lib/squid/basic_ncsa_auth /usr/lib/squid/basic_ncsa_auth
COPY --from=build /out/usr/share/squid /usr/share/squid
COPY --from=build /src/COPYING /app/licenses/Squid-COPYING
COPY runtime /app/runtime
COPY web /app/web
COPY release.json /app/release.json
COPY LICENSE /app/licenses/Wrapper-LICENSE
COPY run.sh /app/run.sh
RUN chmod 0755 /app/run.sh
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
LABEL io.hass.name="Squid Proxy" io.hass.type="app" io.hass.arch="${BUILD_ARCH}" \
    io.hass.version="${BUILD_VERSION}" \
    org.opencontainers.image.title="Squid Proxy for Home Assistant" \
    org.opencontainers.image.source="https://github.com/matsob0123/hassio-addons/tree/main/squid-proxy" \
    org.opencontainers.image.version="${BUILD_VERSION}" \
    org.opencontainers.image.licenses="MIT AND GPL-2.0-or-later"
EXPOSE 3128 3129 8099
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD ["python3", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8099/health',timeout=3).read()"]
ENTRYPOINT ["/app/run.sh"]
