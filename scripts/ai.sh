#!/bin/sh
# Start History Hub's local Python backend.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

if [ -x "$ROOT/.venv/bin/python" ]; then
  PYTHON="$ROOT/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON=$(command -v python3)
else
  echo "Python 3 was not found. Install Python 3 or create .venv first." >&2
  exit 1
fi

exec "$PYTHON" "$ROOT/server/app.py"
