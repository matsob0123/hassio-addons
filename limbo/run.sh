#!/bin/bash

echo "Przechodzę do katalogu: $WORKDIR"
cd "$WORKDIR" || { echo "Nie mogę wejść do $WORKDIR"; exit 1; }

echo "Uruchamiam komendę: $COMMAND"
exec $COMMAND
