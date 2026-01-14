#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export ROOT_DIR
export BUILD_DIR="${BUILD_DIR:-$ROOT_DIR/build}"
export APP_PORT="${APP_PORT:-8080}"
