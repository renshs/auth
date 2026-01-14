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
npx tsc --project "$ROOT_DIR/tsconfig.json" --outDir "$BUILD_DIR" "${TS_FLAGS[@]}"
echo "Build complete: $BUILD_DIR"
