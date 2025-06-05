#!/bin/bash

# Domyślne ścieżki i argumenty z env (ustawione przez Home Assistant)
JAR_PATH="${JAR_PATH:-/config/limbo/LIMBO.jar}"
ARGS="${ARGS:---nogui}"

echo "Uruchamiam LIMBO.jar: $JAR_PATH z argumentami: $ARGS"
exec java -jar "$JAR_PATH" $ARGS
