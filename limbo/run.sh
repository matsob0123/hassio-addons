#!/bin/bash
set -e
set -x  # Włącz debug

CONFIG_FILE="/data/options.json"
WORKDIR=$(jq -r '.WORKDIR // "/config/limbo"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar limbo.jar --nogui"' "$CONFIG_FILE")

echo "Przechodzę do katalogu: $WORKDIR"
if ! cd "$WORKDIR"; then
  echo "❌ Nie mogę wejść do katalogu $WORKDIR"
  exit 1
fi

echo "▶️ Uruchamiam komendę: $COMMAND"
$COMMAND
EXITCODE=$?

echo "❗ Proces zakończył się z kodem $EXITCODE"
sleep 3600
