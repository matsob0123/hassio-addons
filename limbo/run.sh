#!/bin/bash

# Wczytaj opcje z JSON
CONFIG_FILE="/data/options.json"
WORKDIR=$(jq -r '.WORKDIR // "/config/limbo"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar limbo.jar --nogui"' "$CONFIG_FILE")

echo "Przechodzę do katalogu: $WORKDIR"
cd "$WORKDIR" || { echo "❌ Nie mogę wejść do katalogu $WORKDIR"; exit 1; }

echo "▶️ Uruchamiam komendę: $COMMAND"
exec $COMMAND
