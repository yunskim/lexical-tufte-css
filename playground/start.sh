#!/usr/bin/env bash
set -euo pipefail

playground="$(cd "$(dirname "$0")" && pwd)"
repository="$(cd "$playground/.." && pwd)"
cache="$playground/.cache"
sources="$cache/sources"
lexical="$sources/lexical-0.52.0"
upstream="b2af316af8ab328a86ff27885f2ce94f18dce571"

mkdir -p "$sources"
if [[ ! -f "$lexical/package.json" ]]; then
  staging="$(mktemp -d "$sources/.lexical.XXXXXX")"
  trap 'rm -rf "$staging"' EXIT
  curl --fail --location --silent --show-error --retry 2 \
    --output "$staging/lexical.tar.gz" "https://codeload.github.com/meta/lexical/tar.gz/$upstream"
  mkdir "$staging/source"
  tar -xzf "$staging/lexical.tar.gz" -C "$staging/source" --strip-components=1
  mv "$staging/source" "$lexical"
fi

ln -sfn "$repository" "$sources/lexical-tufte-css"
cp -R "$playground/overlay/." "$lexical/"
cp "$playground/run-vite.sh" "$cache/run-vite.sh"

assets="$repository/fixtures/tufte/upstream"
if ! (cd "$repository" && node --input-type=module -e \
  "import {loadVerifiedUpstreamAssets} from './scripts/upstream-visual-assets.mjs'; loadVerifiedUpstreamAssets();" >/dev/null 2>&1); then
  node "$repository/scripts/sync-upstream-visual-assets.mjs"
fi
public_subdir="$lexical/packages/lexical-playground/public/tufte-sample"
cp -R "$assets/img" "$assets/et-book" "$public_subdir/"

export TUFTE_PLAYGROUND_SOURCE_DIR="$repository"
exec bash "$cache/run-vite.sh"
