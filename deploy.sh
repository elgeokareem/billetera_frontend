#!/usr/bin/env bash
#
# Deploy only the billetera frontend.
#
# Expected layout:
#   ~/documents/projects/billetera/frontend   (this repo)
#   ~/documents/projects/billetera/deploy.env   (site settings, untracked)
#
# deploy.env must set:
#   BACKEND_URL=https://api.example.com
#
# deploy.env can set:
#   # APP_DIR=/opt/billetera/frontend
#   # APP_USER=billetera
#   # BRANCH=main
#   # OPENAPI_PATH=../backend/docs/openapi/openapi.json
#   # PNPM_VERSION=12.14.0
#
# If OPENAPI_PATH exists, the script regenerates api-schema.d.ts from that file
# before linting, testing and building. It reads the backend spec; it never
# pulls or deploys the backend.

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$HOME/documents/projects/billetera}"
if [ -f "$PROJECT_ROOT/deploy.env" ]; then
  # shellcheck disable=SC1091
  . "$PROJECT_ROOT/deploy.env"
fi

FRONTEND_DIR="${FRONTEND_DIR:-$PROJECT_ROOT/frontend}"
APP_DIR="${APP_DIR:-/opt/billetera/frontend}"
APP_USER="${APP_USER:-billetera}"
BRANCH="${BRANCH:-main}"
PNPM_VERSION="${PNPM_VERSION:-12.14.0}"
OPENAPI_FILE="${OPENAPI_PATH:-$PROJECT_ROOT/backend/docs/openapi/openapi.json}"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

log() {
  printf '\n==> %s\n' "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_dir() {
  [ -d "$1" ] || die "missing directory: $1"
}

require_clean() {
  if [ -n "$(git -C "$1" status --porcelain)" ]; then
    printf 'ERROR: %s has local changes; commit or stash them first.\n' "$1" >&2
    git -C "$1" status --short >&2
    exit 1
  fi
}

require_dir "$FRONTEND_DIR"
[ -n "${BACKEND_URL:-}" ] || die "set BACKEND_URL in $PROJECT_ROOT/deploy.env"

# Node is installed with nvm on the VPS; load it when present.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
fi
if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  corepack prepare "pnpm@${PNPM_VERSION}" --activate >/dev/null 2>&1 || true
fi
command -v pnpm >/dev/null 2>&1 || die "pnpm not found after loading Node"

log "Pulling frontend ($BRANCH)"
require_clean "$FRONTEND_DIR"
git -C "$FRONTEND_DIR" pull --ff-only origin "$BRANCH"

log "Installing frontend dependencies"
(
  cd "$FRONTEND_DIR"
  pnpm install --frozen-lockfile
)

restore_generated() {
  git -C "$FRONTEND_DIR" checkout -- src/modules/shared/api-schema.d.ts >/dev/null 2>&1 || true
}
trap restore_generated EXIT

if [ -f "$OPENAPI_FILE" ]; then
  log "Regenerating API types from $OPENAPI_FILE"
  (
    cd "$FRONTEND_DIR"
    export OPENAPI_PATH="$OPENAPI_FILE"
    export VITE_BACKEND_ENDPOINT="$BACKEND_URL"
    pnpm api:generate
    pnpm verify
  )
else
  log "No backend spec at $OPENAPI_FILE; building with the committed API types"
  (
    cd "$FRONTEND_DIR"
    export VITE_BACKEND_ENDPOINT="$BACKEND_URL"
    pnpm lint
    pnpm test
    pnpm build
  )
fi

restore_generated
trap - EXIT

log "Publishing frontend"
$SUDO mkdir -p "$APP_DIR"
$SUDO rm -rf "$APP_DIR/dist.new"
$SUDO cp -a "$FRONTEND_DIR/dist" "$APP_DIR/dist.new"
$SUDO rm -rf "$APP_DIR/dist"
$SUDO mv "$APP_DIR/dist.new" "$APP_DIR/dist"

if id "$APP_USER" >/dev/null 2>&1; then
  $SUDO chown -R "$APP_USER:$APP_USER" "$APP_DIR"
fi

[ -f "$APP_DIR/dist/index.html" ] || die "the frontend build did not produce index.html"

log "Deployed"
printf 'frontend: %s\n' "$(git -C "$FRONTEND_DIR" rev-parse --short HEAD)"
echo "Deployment complete!"
