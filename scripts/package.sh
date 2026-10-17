#!/usr/bin/env bash
# Zips extension/ into dist/itr-desk-<version>.zip for Chrome Web Store upload.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(python3 -c "import json;print(json.load(open('extension/manifest.json'))['version'])")
mkdir -p dist
OUT="dist/itr-desk-$VERSION.zip"
rm -f "$OUT"
(cd extension && zip -qr "../$OUT" . -x '*.DS_Store' -x 'Thumbs.db')
echo "Wrote $OUT"
