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

WORKDIR=$(jq -r '.WORKDIR // "/share/temurin-21"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar example.jar --nogui"' "$CONFIG_FILE")

log "Changing to working directory: $WORKDIR"

if [ ! -d "$WORKDIR" ]; then
  log "Directory $WORKDIR does not exist. Creating..."
  mkdir -p "$WORKDIR"
fi

cd "$WORKDIR" || {
  log "Failed to enter directory $WORKDIR"
  exit 1
}

log "Listing /share directory content:"
ls -l /share || log "Cannot list /share directory"

log "Listing $WORKDIR directory content:"
ls -l "$WORKDIR" || log "Cannot list $WORKDIR directory"

log "Displaying text files in $WORKDIR:"
TEXTFILES=$(find . -maxdepth 1 -type f \( -name '*.txt' -o -name '*.json' -o -name '*.log' \) | head -n 5)
for f in $TEXTFILES; do
  log "File: $f content:"
  head -c 1024 "$f" || log "Failed to read $f"
done

# Extract .jar file from command
JARFILE=$(echo "$COMMAND" | grep -oE 'java -jar ([^ ]+)' | awk '{print $3}')
if [ -z "$JARFILE" ]; then
  JARFILE="example.jar"
fi

# Attempt to copy JAR from /opt (inside container) if missing in $WORKDIR
if [ ! -f "$JARFILE" ]; then
  if [ -f "/opt/$JARFILE" ]; then
    log "Jar file '$JARFILE' not found in $WORKDIR. Copying from /opt/$JARFILE..."
    cp "/opt/$JARFILE" "$JARFILE"
  fi
fi

if [ ! -f "$JARFILE" ]; then
  log "Error: Jar file '$JARFILE' not found in $WORKDIR"
  exit 2
fi

log "Running command: $COMMAND"

if [ "$DEBUG" = "true" ]; then
  set +x
fi

$COMMAND
EXITCODE=$?

log "Process exited with code $EXITCODE"
exit $EXITCODE
