#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "[antigravity-zh-cn-pack] Node.js 22+ is required: https://nodejs.org/"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[antigravity-zh-cn-pack] npm is required. Install Node.js 22+ first."
  exit 1
fi

node scripts/setup.mjs "$@"
