#!/usr/bin/env bash
set -euo pipefail
bundle_dir="$(cd "$(dirname "$0")" && pwd)"
if ! command -v pnpm >/dev/null 2>&1; then
  runtime_dir="${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies"
  if [[ -x "$runtime_dir/bin/fallback/pnpm" ]]; then
    export PATH="$runtime_dir/node/bin:$runtime_dir/bin/fallback:$PATH"
  fi
fi
cd "$bundle_dir/sources/lexical-0.52.0"
if [[ ! -x packages/lexical-playground/node_modules/.bin/vite ||
      ! -f packages/lexical-compiler/node_modules/@babel/parser/package.json ]]; then
  pnpm --config.manage-package-manager-versions=false \
    --filter 'lexical-playground...' --filter '@lexical/compiler...' install --frozen-lockfile
fi
cd packages/lexical-playground
exec node_modules/.bin/vite --host 127.0.0.1 --port "${TUFTE_PLAYGROUND_PORT:-5191}" --strictPort
