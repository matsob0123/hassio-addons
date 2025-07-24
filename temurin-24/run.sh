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

WORKDIR=$(jq -r '.WORKDIR // "/share/temurin-24"' "$CONFIG_FILE")
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

log "Listing $WORKDIR directory content:"
ls -l "$WORKDIR"

# Extract .jar file from command
JARFILE=$(echo "$COMMAND" | grep -oE 'java -jar ([^ ]+)' | awk '{print $3}')
if [ -z "$JARFILE" ]; then
  JARFILE="example.jar"
fi

SRC_JAR="/opt/$JARFILE"
DST_JAR="$WORKDIR/$JARFILE"

# Copy only if source is newer
if [ -f "$SRC_JAR" ]; then
  if [ ! -f "$DST_JAR" ]; then
    log "Jar file not found in $WORKDIR. Copying from image..."
    cp "$SRC_JAR" "$DST_JAR"
  elif [ "$SRC_JAR" -nt "$DST_JAR" ]; then
    log "A newer version of $JARFILE was found in the image. Updating..."
    cp "$SRC_JAR" "$DST_JAR"
  else
    log "Jar file exists and is up-to-date."
  fi
else
  if [ ! -f "$DST_JAR" ]; then
    log "Error: Jar file '$JARFILE' not found anywhere."
    exit 2
  fi
fi

log "Running command: $COMMAND"

if [ "$DEBUG" = "true" ]; then
  set +x
fi

$COMMAND
EXITCODE=$?

log "Process exited with code $EXITCODE"
exit $EXITCODE
