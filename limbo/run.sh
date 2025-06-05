#!/bin/bash

# Wyświetl przekazane wartości (debug)
echo "Używam JAR_PATH: $JAR_PATH"
echo "Używam ARGS: $ARGS"

# Domyślne wartości, jeśli nie ustawione
JAR_PATH="${JAR_PATH:-/config/limbo/LIMBO.jar}"
ARGS="${ARGS:---nogui}"

# Uruchom
exec java -jar "$JAR_PATH" $ARGS
