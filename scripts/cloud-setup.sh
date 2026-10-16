#!/bin/bash
# Bootstrap for Claude Code cloud sessions.
#
# The environment's setup script only calls this file, so the install logic is
# versioned with the repo instead of living in the environment settings.
# Safe to run repeatedly: dependencies reinstall only when package-lock.json
# changed, and the core is always rebuilt (apps/web resolves @poe2/core to its
# dist/, so web typecheck and tests fail without it).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f package-lock.json ] || exit 0

if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  echo "cloud-setup: Node >=22 required, found $(node -v)" >&2
  exit 1
fi

stamp=node_modules/.lock.sha256
sum=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ ! -f "$stamp" ] || [ "$(cat "$stamp")" != "$sum" ]; then
  npm ci --no-audit --no-fund --loglevel=error
  echo "$sum" > "$stamp"
fi

npm run build --workspace @poe2/core --silent
