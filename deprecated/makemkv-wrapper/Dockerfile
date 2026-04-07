ARG BUILD_FROM=jlesage/makemkv:latest
FROM ${BUILD_FROM}

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

RUN apk add --no-cache \
        bash \
        jq \
        tzdata \
    && rm -rf /var/cache/apk/*

# ── Wryty skrypt init (cont-init.d) ──────────────────────────────────────────
# Tworzymy plik bezposrednio przez RUN + printf, bez COPY.
# Dzieki temu GitHub nie ma nic do sledzenia - skrypt zyje w Dockerfile.
RUN mkdir -p /etc/cont-init.d && printf '%s\n' \
    '#!/usr/bin/env bash' \
    '# /etc/cont-init.d/10-makemkv-options.sh' \
    '# Czyta /data/options.json i zapisuje zmienne do s6 container_environment.' \
    'set -euo pipefail' \
    'OPTIONS_FILE="/data/options.json"' \
    'ENV_DIR="/var/run/s6/container_environment"' \
    'log() { echo "[makemkv-init] $*"; }' \
    'write_env() { local var="$1"; local val="$2"; printf "%s" "$val" > "${ENV_DIR}/${var}"; }' \
    'opt() { local key="$1"; local default="${2:-}"; local val; val=$(jq -r ".$key // empty" "$OPTIONS_FILE" 2>/dev/null || true); echo "${val:-$default}"; }' \
    'adr() { [[ "$(opt "$1" false)" == "true" ]] && echo 1 || echo 0; }' \
    'if [[ ! -f "$OPTIONS_FILE" ]]; then log "WARNING: $OPTIONS_FILE not found — using jlesage defaults."; exit 0; fi' \
    'mkdir -p "$ENV_DIR"' \
    'write_env USER_ID   "$(opt puid  1000)"' \
    'write_env GROUP_ID  "$(opt pgid  1000)"' \
    'write_env UMASK     "$(opt umask 0022)"' \
    'TZ_VAL=$(opt timezone "Europe/Warsaw")' \
    'write_env TZ "$TZ_VAL"' \
    'ln -snf "/usr/share/zoneinfo/${TZ_VAL}" /etc/localtime 2>/dev/null || true' \
    'echo "$TZ_VAL" > /etc/timezone 2>/dev/null || true' \
    'MKEY=$(opt makemkv_key "")' \
    '[[ -n "$MKEY" ]] && write_env MAKEMKV_KEY "$MKEY"' \
    'write_env DISPLAY_WIDTH  "$(opt display_width  1280)"' \
    'write_env DISPLAY_HEIGHT "$(opt display_height 768)"' \
    'VNC_PASS=$(opt vnc_password "")' \
    '[[ -n "$VNC_PASS" ]] && write_env VNC_PASSWORD "$VNC_PASS"' \
    'write_env AUTO_DISC_RIPPER                         "$(adr auto_disc_ripper)"' \
    'write_env AUTO_DISC_RIPPER_EJECT                   "$(adr auto_disc_ripper_eject)"' \
    'write_env AUTO_DISC_RIPPER_PARALLEL_RIP            "$(adr auto_disc_ripper_parallel_rip)"' \
    'write_env AUTO_DISC_RIPPER_INTERVAL                "$(opt auto_disc_ripper_interval 5)"' \
    'write_env AUTO_DISC_RIPPER_MIN_TITLE_LENGTH        "$(opt auto_disc_ripper_min_title_length 600)"' \
    'write_env AUTO_DISC_RIPPER_BD_MODE                 "$(opt auto_disc_ripper_bd_mode mkv)"' \
    'write_env AUTO_DISC_RIPPER_FORCE_UNIQUE_OUTPUT_DIR "$(adr auto_disc_ripper_force_unique_output_dir)"' \
    'OUTPUT=$(opt output_path "/media/makemkv")' \
    'write_env OUTPUT_PATH "$OUTPUT"' \
    'mkdir -p "$OUTPUT" 2>/dev/null || true' \
    'write_env KEEP_APP_RUNNING "$(adr keep_app_running)"' \
    'write_env APP_NICENESS     "$(opt app_niceness 0)"' \
    '[[ "$(opt enable_cjk_font false)" == "true" ]] && write_env ENABLE_CJK_FONT 1 || true' \
    '[[ "$(opt dark_mode false)"       == "true" ]] && write_env DARK_MODE 1       || true' \
    'write_env LOG_LEVEL "$(opt log_level info)"' \
    'log "Options applied successfully."' \
    'log "  Output path : $OUTPUT"' \
    'log "  Timezone    : $TZ_VAL"' \
    'log "  PUID/PGID   : $(opt puid 1000) / $(opt pgid 1000)"' \
    'log "  Auto-ripper : $(opt auto_disc_ripper false)"' \
    > /etc/cont-init.d/10-makemkv-options.sh \
    && chmod 755 /etc/cont-init.d/10-makemkv-options.sh

# ── Wryty skrypt service run ──────────────────────────────────────────────────
RUN mkdir -p /etc/services.d/makemkv && printf '%s\n' \
    '#!/usr/bin/execlineb -P' \
    'with-contenv' \
    '/startapp.sh' \
    > /etc/services.d/makemkv/run \
    && chmod 755 /etc/services.d/makemkv/run

# ── Wryty skrypt service finish ───────────────────────────────────────────────
RUN printf '%s\n' \
    '#!/usr/bin/execlineb -S0' \
    '/run/s6/basedir/bin/halt' \
    > /etc/services.d/makemkv/finish \
    && chmod 755 /etc/services.d/makemkv/finish

EXPOSE 5800

ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_DESCRIPTION
ARG BUILD_NAME
ARG BUILD_REF
ARG BUILD_REPOSITORY
ARG BUILD_VERSION

# ── Entrypoint: s6-overlay /init (NIE DOTYKAC!) ───────────────────────────────
# /init to symlink zarzadzany przez jlesage base image.
# Jakikolwiek chmod na /init niszczy bit wykonywalny i zabija kontener.
ENTRYPOINT ["/init"]