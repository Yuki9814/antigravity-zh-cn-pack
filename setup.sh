#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

print_node_help() {
  cat <<'EOF'
[antigravity-zh-cn-pack] Node.js 22+ is required.

Recommended install paths:
- Homebrew: brew install node
- Official package: https://nodejs.org/

After Node.js 22+ is ready, run again:
  bash setup.sh
EOF
}

if ! command -v node >/dev/null 2>&1; then
  print_node_help
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  print_node_help
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
if ! [[ "$NODE_MAJOR" =~ ^[0-9]+$ ]] || [ "$NODE_MAJOR" -lt 22 ]; then
  echo "[antigravity-zh-cn-pack] Current Node.js: $(node -v 2>/dev/null || echo unknown)"
  print_node_help
  exit 1
fi

node scripts/setup.mjs "$@"
