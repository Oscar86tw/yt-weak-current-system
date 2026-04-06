#!/usr/bin/env bash
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set"
  exit 1
fi
OUTFILE="${1:-yt_weak_current_native_backup.sql}"
pg_dump --no-owner --no-privileges --clean --if-exists --dbname="$DATABASE_URL" --file="$OUTFILE"
echo "Backup created: $OUTFILE"
