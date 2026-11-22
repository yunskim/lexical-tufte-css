#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
사용법: bash playground/start.sh [옵션] [-- Vite 옵션...]

  -p, --port PORT       시작 포트 (기본값 5191, 환경변수 TUFTE_PLAYGROUND_PORT)
  -H, --host HOST       수신 주소 (기본값 127.0.0.1, 환경변수 TUFTE_PLAYGROUND_HOST)
      --allow-port-fallback
                        지정 포트가 사용 중이면 다음 빈 포트를 사용
  -h, --help            도움말 표시

예시:
  bash playground/start.sh --port 5196
  bash playground/start.sh --port 5200 --host 0.0.0.0 -- --open --force
  bash playground/start.sh --port 5200 --allow-port-fallback
EOF
}

fail() {
  printf 'playground/start.sh: %s\n' "$1" >&2
  exit 2
}

port="${TUFTE_PLAYGROUND_PORT:-5191}"
host="${TUFTE_PLAYGROUND_HOST:-127.0.0.1}"
strict_port=true
vite_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port|-H|--host)
      [[ $# -ge 2 && -n "$2" && "$2" != -* ]] || fail "$1 옵션에 값을 지정하세요."
      case "$1" in
        -p|--port) port="$2" ;;
        *) host="$2" ;;
      esac
      shift
      ;;
    --port=*) port="${1#*=}" ;;
    --host=*) host="${1#*=}" ;;
    --allow-port-fallback) strict_port=false ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      vite_args+=("$@")
      break
      ;;
    *) vite_args+=("$1") ;;
  esac
  shift
done

[[ "$port" =~ ^[0-9]{1,5}$ ]] && (( 10#$port >= 1 && 10#$port <= 65535 )) ||
  fail "포트는 1~65535 사이의 숫자여야 합니다."
[[ -n "$host" && "$host" != -* ]] || fail "호스트 주소를 지정하세요."

bundle_dir="$(cd "$(dirname "$0")" && pwd)"
if ! command -v pnpm >/dev/null 2>&1; then
  runtime_dir="${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies"
  if [[ -x "$runtime_dir/bin/fallback/pnpm" ]]; then
    export PATH="$runtime_dir/node/bin:$runtime_dir/bin/fallback:$PATH"
  fi
fi
command -v pnpm >/dev/null 2>&1 || fail "pnpm을 찾을 수 없습니다. pnpm 11을 설치해 주세요."
cd "$bundle_dir/sources/lexical-0.52.0"
if [[ ! -x packages/lexical-playground/node_modules/.bin/vite ||
      ! -f packages/lexical-compiler/node_modules/@babel/parser/package.json ]]; then
  pnpm --config.manage-package-manager-versions=false \
    --filter 'lexical-playground...' --filter '@lexical/compiler...' install --frozen-lockfile
fi
if [[ "$strict_port" == true ]]; then
  vite_args+=(--strictPort)
fi
exec pnpm --config.manage-package-manager-versions=false --filter lexical-playground exec vite \
  --host "$host" --port "$((10#$port))" ${vite_args[@]+"${vite_args[@]}"}
