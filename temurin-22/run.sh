#!/bin/bash
set -e

log() {
  echo "$(date '+%H:%M:%S') $*"
}

CONFIG_FILE="/data/options.json"
DEBUG=$(jq -r '.DEBUG // false' "$CONFIG_FILE")

if [ "$DEBUG" = "true" ]; then
  set -x
fi

log "Reading config from $CONFIG_FILE"
cat "$CONFIG_FILE"

WORKDIR=$(jq -r '.WORKDIR // "/share/temurin-22"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar example.jar --nogui"' "$CONFIG_FILE")
STOP_COMMAND=$(jq -r '.STOP_COMMAND // empty' "$CONFIG_FILE")

log "📁 Changing to working directory: $WORKDIR"

if [ ! -d "$WORKDIR" ]; then
  log "📂 Directory $WORKDIR does not exist. Creating..."
  mkdir -p "$WORKDIR"
fi

cd "$WORKDIR" || {
  log "❌ Failed to enter directory $WORKDIR"
  exit 1
}

log "📂 Listing contents of $WORKDIR:"
ls -la

# Extract jar filename from command
JARFILE=$(echo "$COMMAND" | grep -oE 'java -jar ([^ ]+)' | awk '{print $3}')
JARFILE=${JARFILE:-example.jar}

SRC_JAR="/opt/$JARFILE"
DST_JAR="$WORKDIR/$JARFILE"

# Only copy if source exists
if [ -f "$SRC_JAR" ]; then
  if [ ! -f "$DST_JAR" ]; then
    log "📥 Copying $JARFILE to $WORKDIR (not found)"
    cp "$SRC_JAR" "$DST_JAR"
  elif [ "$SRC_JAR" -nt "$DST_JAR" ]; then
    log "📤 Found newer $JARFILE in /opt, updating..."
    cp "$SRC_JAR" "$DST_JAR"
  else
    log "✅ $JARFILE is up-to-date."
  fi
else
  log "ℹ️ No built-in $SRC_JAR found (this is OK if provided manually)."
fi

# Final check
if [ ! -f "$DST_JAR" ]; then
  log "❌ Error: $JARFILE not found in $WORKDIR"
  exit 2
fi

# Optional: Check if jar is valid
if ! unzip -l "$DST_JAR" >/dev/null 2>&1; then
  log "❌ Error: $JARFILE appears to be corrupted or invalid JAR!"
  exit 3
fi

log "▶️ Running command: $COMMAND"

# Handle optional stop command
cleanup() {
  if [ -n "$STOP_COMMAND" ]; then
    log "🛑 Sending stop command: $STOP_COMMAND"
    echo "$STOP_COMMAND"
  fi
  log "🧹 Cleaning up..."
}
trap cleanup SIGTERM SIGINT

# Run the Java command directly, letting it use stdin normally
bash -c "$COMMAND"
EXITCODE=$?

log "❗ Process exited with code $EXITCODE"
exit $EXITCODE
