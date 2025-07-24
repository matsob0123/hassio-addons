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

log "Changing to working directory: $WORKDIR"

if [ ! -d "$WORKDIR" ]; then
  log "Directory $WORKDIR does not exist. Creating..."
  mkdir -p "$WORKDIR"
fi

cd "$WORKDIR" || {
  log "❌ Failed to enter directory $WORKDIR"
  exit 1
}

log "📂 Listing contents of $WORKDIR:"
ls -l "$WORKDIR"

# Extract .jar filename
JARFILE=$(echo "$COMMAND" | grep -oE 'java -jar ([^ ]+)' | awk '{print $3}')
if [ -z "$JARFILE" ]; then
  JARFILE="example.jar"
fi

SRC_JAR="/opt/$JARFILE"
DST_JAR="$WORKDIR/$JARFILE"

# Copy if newer
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
  if [ ! -f "$DST_JAR" ]; then
    log "❌ Error: $JARFILE not found in image or workdir!"
    exit 2
  fi
fi

log "▶️ Running command: $COMMAND"

# Setup FIFO pipe to send stop signal if needed
PIPE=$(mktemp -u)
mkfifo "$PIPE"
tail -f "$PIPE" &
TAIL_PID=$!

# Handle shutdown cleanly
cleanup() {
  if [ -n "$STOP_COMMAND" ]; then
    log "🛑 Sending stop command: $STOP_COMMAND"
    echo "$STOP_COMMAND" > "$PIPE"
    sleep 5
  fi
  log "🧹 Cleaning up..."
  kill "$TAIL_PID" 2>/dev/null || true
  rm -f "$PIPE"
}
trap cleanup SIGTERM SIGINT

# Run main command with stdin from FIFO
bash -c "$COMMAND" < "$PIPE" &
JAVA_PID=$!

wait "$JAVA_PID"
EXITCODE=$?

log "❗ Process exited with code $EXITCODE"
exit $EXITCODE
