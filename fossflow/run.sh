#!/bin/sh
set -eu
# Docker / Supervisor supplies its init (config.yaml: init: true).
# A single Node process owns both listeners and drains writes on SIGTERM.
exec node /app/runtime/main.mjs
