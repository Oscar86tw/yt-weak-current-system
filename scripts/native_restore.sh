#!/usr/bin/env bash
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set"
  exit 1
fi
INFILE="${1:-}"
if [ -z "$INFILE" ]; then
  echo "Usage: ./native_restore.sh <backup.sql>"
  exit 1
fi
psql "$DATABASE_URL" -f "$INFILE"
echo "Restore finished: $INFILE"
