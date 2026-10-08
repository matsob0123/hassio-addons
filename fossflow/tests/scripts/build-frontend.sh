#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
mkdir -p .work/upstream
echo "c180962e256127a00ad51d65f0ab41fa984f1d3d320d2258d964ddd3e9f0111c  vendor/fossflow.tar.gz" | sha256sum -c -
tar -xzf vendor/fossflow.tar.gz -C .work/upstream
node frontend/patch-upstream.mjs .work/upstream
cd .work/upstream
npm ci --no-audit --no-fund
PUBLIC_URL=./ npm run build
