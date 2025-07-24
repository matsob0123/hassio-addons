#!/bin/bash
set -e

CONFIG_FILE="/data/options.json"
WORKDIR=$(jq -r '.WORKDIR // "/config/temurin-21"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar test.jar --nogui"' "$CONFIG_FILE")

echo "📁 Changing to working directory: $WORKDIR"

# Create the directory if it doesn't exist
if [ ! -d "$WORKDIR" ]; then
  echo "📂 Directory $WORKDIR does not exist. Creating..."
  mkdir -p "$WORKDIR"
fi

if ! cd "$WORKDIR"; then
  echo "❌ Failed to change to directory $WORKDIR"
  exit 1
fi

echo "▶️ Running command: $COMMAND"
$COMMAND
EXITCODE=$?

echo "❗ Process exited with code $EXITCODE"
