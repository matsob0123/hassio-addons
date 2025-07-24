#!/bin/bash
set -e

CONFIG_FILE="/data/options.json"
WORKDIR=$(jq -r '.WORKDIR // "/config/temurin-21"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar test.jar --nogui"' "$CONFIG_FILE")

# Create the working directory if it doesn't exist
if [ ! -d "$WORKDIR" ]; then
  mkdir -p "$WORKDIR"
fi

cd "$WORKDIR" || {
  echo "Failed to enter directory $WORKDIR"
  exit 1
}

$COMMAND
EXITCODE=$?

echo "Process exited with code $EXITCODE"
