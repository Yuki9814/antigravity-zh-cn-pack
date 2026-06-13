#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT" || exit 1

echo "[antigravity-zh-cn-pack] installer"
echo "Root: $ROOT"
echo

bash setup.sh "$@"
STATUS=$?

echo
if [ "$STATUS" -eq 0 ]; then
  echo "[antigravity-zh-cn-pack] install completed."
  echo "Next: restart/open Antigravity pages, then run npm run doctor:strict."
else
  echo "[antigravity-zh-cn-pack] install did not complete."
  echo "See docs/TROUBLESHOOTING.md for fix steps."
fi

if [ -t 0 ]; then
  printf "Press Return to close this window..."
  read -r _
fi

exit "$STATUS"
