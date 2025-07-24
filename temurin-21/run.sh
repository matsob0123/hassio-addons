#!/bin/bash
set -e
set -x # Włącz debug

CONFIG_FILE="/data/options.json"
WORKDIR=$(jq -r '.WORKDIR // "/config/limbo"' "$CONFIG_FILE")
COMMAND=$(jq -r '.COMMAND // "java -jar limbo.jar --nogui"' "$CONFIG_FILE")

echo "Przechodzę do katalogu: $WORKDIR"
if ! cd "$WORKDIR"; then
  echo "❌ Nie mogę wejść do katalogu $WORKDIR"
  exit 1
fi

echo "▶️ Uruchamiam komendę: $COMMAND"

# Uruchom komendę w tle i zapisz jej PID
# Run the command in the background and store its PID
$COMMAND &
CHILD_PID=$!

# Funkcja do obsługi sygnałów (np. SIGTERM)
# Function to handle signals (e.g., SIGTERM)
handle_signal() {
  echo "Otrzymano sygnał, przekazuję do procesu Javy (PID: $CHILD_PID)..."
  # Przekaż sygnał do procesu potomnego Javy
  # Forward the signal to the child Java process
  kill -TERM "$CHILD_PID"
  wait "$CHILD_PID" # Poczekaj, aż proces Javy się zakończy
  EXITCODE=$?
  echo "❗ Proces Javy zakończył się z kodem $EXITCODE po sygnale."
  exit $EXITCODE
}

# Ustaw pułapkę na sygnał TERM
# Set a trap for the TERM signal
trap 'handle_signal' TERM

# Czekaj na zakończenie procesu Javy
# Wait for the Java process to finish
wait "$CHILD_PID"
EXITCODE=$?

echo "❗ Proces zakończył się z kodem $EXITCODE"
exit $EXITCODE