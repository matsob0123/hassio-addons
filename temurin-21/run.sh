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

JARFILE=$(echo "$COMMAND" | grep -oE 'java -jar ([^ ]+)' | awk '{print $3}')
if [ -z "$JARFILE" ]; then
  JARFILE="example.jar"
fi

if [ ! -f "$JARFILE" ]; then
  log "Error: Jar file '$JARFILE' not found in $WORKDIR"
  exit 2
fi

log "Running command: $COMMAND"

# Wyłącz set -x przed uruchomieniem aby nie pokazywał komend programu java
if [ "$DEBUG" = "true" ]; then
  set +x
fi

$COMMAND
EXITCODE=$?

log "Process exited with code $EXITCODE"
exit $EXITCODE
