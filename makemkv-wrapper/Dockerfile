##
## MakeMKV Wrapper — Dockerfile
## Ported by matsob0123
## Base: jlesage/docker-makemkv (multi-arch)
##

ARG BUILD_FROM=jlesage/makemkv:latest
# shellcheck disable=SC2034
FROM ${BUILD_FROM}

##──────────────────────────────────────────────────────────────────────────────
## Labels (OCI / Home Assistant)
##──────────────────────────────────────────────────────────────────────────────
LABEL \
    io.hass.name="MakeMKV Wrapper" \
    io.hass.description="Rip DVDs & Blu-rays via jlesage/docker-makemkv in Home Assistant" \
    io.hass.arch="aarch64|amd64|armhf|armv7|i386" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="matsob0123" \
    org.opencontainers.image.title="MakeMKV Wrapper" \
    org.opencontainers.image.description="Home Assistant add-on: MakeMKV disc ripper" \
    org.opencontainers.image.source="https://github.com/matsob0123/hass-makemkv" \
    org.opencontainers.image.licenses="MIT"

##──────────────────────────────────────────────────────────────────────────────
## Runtime packages (minimal — the jlesage image already has makemkv)
##──────────────────────────────────────────────────────────────────────────────
# Install bash and jq so run.sh can parse HA options.json
# s6-overlay is already present in the jlesage base image.
RUN apk add --no-cache \
        bash \
        jq \
        tzdata \
    && rm -rf /var/cache/apk/*

##──────────────────────────────────────────────────────────────────────────────
## Copy add-on scripts
##──────────────────────────────────────────────────────────────────────────────
COPY rootfs /

##──────────────────────────────────────────────────────────────────────────────
## Permissions
##──────────────────────────────────────────────────────────────────────────────
RUN chmod a+x \
        /etc/cont-init.d/10-makemkv-options.sh \
        /etc/services.d/makemkv/run \
        /etc/services.d/makemkv/finish

##──────────────────────────────────────────────────────────────────────────────
## Exposed port (ingress proxy connects here)
##──────────────────────────────────────────────────────────────────────────────
EXPOSE 5800

##──────────────────────────────────────────────────────────────────────────────
## Build args (populated by HA build system)
##──────────────────────────────────────────────────────────────────────────────
ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION
