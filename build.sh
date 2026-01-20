#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$ROOT_DIR/config.sh"

MODE="${1:-release}"
case "$MODE" in
  release|debug) ;;
  *)
    echo "Usage: ./build.sh [release|debug]"
    exit 1
    ;;
 esac

TS_FLAGS=()
if [ "$MODE" = "debug" ]; then
  TS_FLAGS+=(--sourceMap --inlineSources)
  export NODE_ENV=development
else
  export NODE_ENV=production
fi

mkdir -p "$BUILD_DIR"
if [ ! -x "$ROOT_DIR/node_modules/.bin/tsc" ]; then
  echo "ERROR: deps not installed. Run: npm install"
  exit 1
fi
if [ ! -d "$ROOT_DIR/ui" ]; then
  echo "ERROR: UI directory not found: $ROOT_DIR/ui"
  exit 1
fi

"$ROOT_DIR/node_modules/.bin/tsc" --project "$ROOT_DIR/tsconfig.json" --outDir "$BUILD_DIR" "${TS_FLAGS[@]}"
mkdir -p "$BUILD_DIR/ui"
cp -f "$ROOT_DIR/ui/index.html" "$ROOT_DIR/ui/app.js" "$ROOT_DIR/ui/register.html" "$ROOT_DIR/ui/register.js" "$BUILD_DIR/ui/"

echo "Build complete: $BUILD_DIR"
