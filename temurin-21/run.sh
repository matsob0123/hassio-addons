#!/bin/bash
set -e

CONFIG_FILE="/data/options.json"

DEBUG=$(jq -r '.DEBUG // false' "$CONFIG_FILE")

if [ "$DEBUG" = "true" ]; then
  set -x
fi

echo "Reading config from $CONFIG_FILE"
cat "$CONFIG_FILE"

WORKDIR=$(jq -r '.WORKDIR // "/share/temurin-21"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar example.jar --nogui"' "$CONFIG_FILE")

echo "Changing to working directory: $WORKDIR"

if [ ! -d "$WORKDIR" ]; then
  echo "Directory $WORKDIR does not exist. Creating..."
  mkdir -p "$WORKDIR"
fi

cd "$WORKDIR" || {
  echo "Failed to enter directory $WORKDIR"
  exit 1
}

JARFILE=$(echo "$COMMAND" | grep -oE 'java -jar ([^ ]+)' | awk '{print $3}')
if [ -z "$JARFILE" ]; then
  JARFILE="example.jar"
fi

if [ ! -f "$JARFILE" ]; then
  echo "Error: Jar file '$JARFILE' not found in $WORKDIR"
  exit 2
fi

echo "Running command: $COMMAND"
$COMMAND
EXITCODE=$?

echo "Process exited with code $EXITCODE"
exit $EXITCODE
