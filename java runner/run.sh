#!/bin/bash
set -e
set -x  # Włącz debug

CONFIG_FILE="/data/options.json"

# Read options from config.json
WORKDIR=$(jq -r '.WORKDIR // "/config/limbo"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar limbo.jar --nogui"' "$CONFIG_FILE")
JAVA_VERSION=$(jq -r '.JAVA_VERSION // "21"' "$CONFIG_FILE") # <--- Get Java version from config

echo "--- Add-on Configuration ---"
echo "Java Version: $JAVA_VERSION"
echo "Working Directory: $WORKDIR"
echo "Command: $COMMAND"
echo "--------------------------"

echo "Przechodzę do katalogu: $WORKDIR"
if ! cd "$WORKDIR"; then
  echo "❌ Nie mogę wejść do katalogu $WORKDIR"
  exit 1
fi

echo "▶️ Uruchamiam komendę: $COMMAND"
# The Java command itself doesn't change here because the desired Java version
# is already part of the base image chosen during the add-on build process.
$COMMAND
EXITCODE=$?

echo "❗ Proces zakończył się z kodem $EXITCODE"