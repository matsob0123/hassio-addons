##
## MakeMKV Wrapper — Dockerfile
## Ported by matsob0123
## Base: jlesage/docker-makemkv (multi-arch, s6-overlay v3)
##
## ⚠️  PLEASE CHANGE THE VERSION NUMBER IN config.yaml TO HIGHER THAN 2.0.3
##     before rebuilding and publishing this add-on!
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
    io.hass.arch="aarch64|amd64" \
    io.hass.type="addon" \
    io.hass.version="${BUILD_VERSION}" \
    maintainer="matsob0123" \
    org.opencontainers.image.title="MakeMKV Wrapper" \
    org.opencontainers.image.description="Home Assistant add-on: MakeMKV disc ripper" \
    org.opencontainers.image.source="https://github.com/matsob0123/hass-makemkv" \
    org.opencontainers.image.licenses="MIT"

##──────────────────────────────────────────────────────────────────────────────
## Runtime packages
## bash and jq are needed to parse HA options.json
## tzdata is needed for timezone support
## s6-overlay is already present in the jlesage base image — do NOT reinstall it
##──────────────────────────────────────────────────────────────────────────────
RUN apk add --no-cache \
        bash \
        jq \
        tzdata \
    && rm -rf /var/cache/apk/*

##──────────────────────────────────────────────────────────────────────────────
## Copy add-on scripts into the container filesystem
##──────────────────────────────────────────────────────────────────────────────
COPY rootfs /

##──────────────────────────────────────────────────────────────────────────────
## Permissions — only chmod the scripts WE added
##
## ⚠️  DO NOT chmod /init — in s6-overlay v3, /init is a symlink managed
##     entirely by the jlesage base image. Running chmod on it corrupts the
##     symlink target's execute bit inside the OCI layer, causing the
##     container to die immediately with:
##
##         /bin/sh: can't open '/init': Permission denied
##
##     The Home Assistant supervisor passes init: false in config.yaml which
##     disables Docker's own tini init. s6 then MUST own PID 1 through its
##     own /init entrypoint. Any interference with that file is fatal.
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

##──────────────────────────────────────────────────────────────────────────────
## Entrypoint — s6-overlay v3 init (inherited from jlesage base image)
## Declared explicitly so HA supervisor always runs the correct PID 1.
## This MUST remain /init — do not change it.
##──────────────────────────────────────────────────────────────────────────────
ENTRYPOINT ["/init"]
