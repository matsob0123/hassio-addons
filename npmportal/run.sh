#!/bin/sh

echo "📦 NPM Addon Runner starting..."
WORKDIR="/share/npmaddon"

# 🛠️ Utwórz katalog, jeśli nie istnieje
if [ ! -d "$WORKDIR" ]; then
  echo "📁 Directory $WORKDIR does not exist. Creating it..."
  mkdir -p "$WORKDIR"
fi

cd "$WORKDIR" || exit 1
echo "📁 Changed directory to $WORKDIR"

# 📄 Wczytaj komendy z konfiguracji
COMMANDS=$(jq -r '.commands[]?' /data/options.json)

if [ -z "$COMMANDS" ]; then
  echo "⚠️ No commands configured."
  exit 0
fi

echo "▶️ Running configured commands:"
echo "$COMMANDS" | while read -r CMD; do
  echo "💡 Running: $CMD"
  sh -c "$CMD"
done

echo "✅ All commands finished."
