#!/usr/bin/env bash
##
## /etc/cont-init.d/10-makemkv-options.sh
## Runs ONCE at container start, BEFORE any service script.
##
## Reads /data/options.json (Home Assistant add-on options) and writes the
## corresponding environment variables into /var/run/s6/container_environment/
## so they are visible to every s6 service via with-contenv.
##
## Ported by matsob0123
##

set -euo pipefail

OPTIONS_FILE="/data/options.json"
ENV_DIR="/var/run/s6/container_environment"

# ── Helpers ──────────────────────────────────────────────────────────────────

log() { echo "[makemkv-init] $*"; }

# Write a single env var to the s6 container_environment directory.
write_env() {
    local var="$1"
    local val="$2"
    printf '%s' "$val" > "${ENV_DIR}/${var}"
}

# Read a value from options.json; return $default if key is null/missing.
opt() {
    local key="$1"
    local default="${2:-}"
    local val
    val=$(jq -r ".$key // empty" "$OPTIONS_FILE" 2>/dev/null || true)
    echo "${val:-$default}"
}

# Boolean helper: return 1 if option is "true", else 0
adr() { [[ "$(opt "$1" false)" == "true" ]] && echo 1 || echo 0; }

# ── Sanity check ─────────────────────────────────────────────────────────────
if [[ ! -f "$OPTIONS_FILE" ]]; then
    log "WARNING: $OPTIONS_FILE not found — using jlesage defaults."
    exit 0
fi

mkdir -p "$ENV_DIR"

# ── Identity ─────────────────────────────────────────────────────────────────
write_env USER_ID   "$(opt puid  1000)"
write_env GROUP_ID  "$(opt pgid  1000)"
write_env UMASK     "$(opt umask 0022)"

# ── Timezone ─────────────────────────────────────────────────────────────────
TZ_VAL=$(opt timezone "Europe/Warsaw")
write_env TZ "$TZ_VAL"
ln -snf "/usr/share/zoneinfo/${TZ_VAL}" /etc/localtime 2>/dev/null || true
echo "$TZ_VAL" > /etc/timezone 2>/dev/null || true

# ── MakeMKV license key ───────────────────────────────────────────────────────
MKEY=$(opt makemkv_key "")
[[ -n "$MKEY" ]] && write_env MAKEMKV_KEY "$MKEY"

# ── Display / VNC ────────────────────────────────────────────────────────────
write_env DISPLAY_WIDTH  "$(opt display_width  1280)"
write_env DISPLAY_HEIGHT "$(opt display_height 768)"
VNC_PASS=$(opt vnc_password "")
[[ -n "$VNC_PASS" ]] && write_env VNC_PASSWORD "$VNC_PASS"

# ── Auto disc ripper ─────────────────────────────────────────────────────────
write_env AUTO_DISC_RIPPER                         "$(adr auto_disc_ripper)"
write_env AUTO_DISC_RIPPER_EJECT                   "$(adr auto_disc_ripper_eject)"
write_env AUTO_DISC_RIPPER_PARALLEL_RIP            "$(adr auto_disc_ripper_parallel_rip)"
write_env AUTO_DISC_RIPPER_INTERVAL                "$(opt auto_disc_ripper_interval 5)"
write_env AUTO_DISC_RIPPER_MIN_TITLE_LENGTH        "$(opt auto_disc_ripper_min_title_length 600)"
write_env AUTO_DISC_RIPPER_BD_MODE                 "$(opt auto_disc_ripper_bd_mode mkv)"
write_env AUTO_DISC_RIPPER_FORCE_UNIQUE_OUTPUT_DIR "$(adr auto_disc_ripper_force_unique_output_dir)"

# ── Output path ───────────────────────────────────────────────────────────────
OUTPUT=$(opt output_path "/media/makemkv")
write_env OUTPUT_PATH "$OUTPUT"
mkdir -p "$OUTPUT" 2>/dev/null || true

# ── Misc ──────────────────────────────────────────────────────────────────────
write_env KEEP_APP_RUNNING "$(adr keep_app_running)"
write_env APP_NICENESS     "$(opt app_niceness 0)"
[[ "$(opt enable_cjk_font false)" == "true" ]] && write_env ENABLE_CJK_FONT 1 || true
[[ "$(opt dark_mode false)"       == "true" ]] && write_env DARK_MODE 1       || true
write_env LOG_LEVEL "$(opt log_level info)"

log "Options applied successfully."
log "  Output path : $OUTPUT"
log "  Timezone    : $TZ_VAL"
log "  PUID/PGID   : $(opt puid 1000) / $(opt pgid 1000)"
log "  Auto-ripper : $(opt auto_disc_ripper false)"
