#!/bin/sh
# Prefer a system Node installation; fall back to this workspace's runtime.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if ! command -v node >/dev/null 2>&1; then
  export PATH="$ROOT/.runtime/node-v22.16.0-darwin-arm64/bin:$PATH"
fi
cd "$ROOT"
exec npm "$@"
