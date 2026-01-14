#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$ROOT_DIR/config.sh"

ENTRY="$BUILD_DIR/app.js"
if [ ! -f "$ENTRY" ]; then
  echo "Build not found: $ENTRY"
  echo "Run: ./build.sh"
  exit 1
fi

node "$ENTRY"
