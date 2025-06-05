#!/bin/bash

WORKDIR="${WORKDIR:-/config/limbo}"
COMMAND="${COMMAND:-java -jar LIMBO.jar --nogui}"

echo "Przechodzę do katalogu: $WORKDIR"
cd "$WORKDIR" || { echo "Nie mogę wejść do $WORKDIR"; exit 1; }

echo "Uruchamiam komendę: $COMMAND"
exec $COMMAND
