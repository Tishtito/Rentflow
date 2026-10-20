#!/usr/bin/env bash
# Build the admin app and the tenant portal here and upload their dist/ folders to the server.
#
#   ./deploy/deploy.sh
#
# The API is deployed from the backend repo (../backend/deploy/deploy.sh).
# Needs: ssh access as tito@102.212.246.251 (key-based), rsync, pnpm.
set -euo pipefail

SERVER="${SERVER:-tito@102.212.246.251}"
REMOTE="${REMOTE:-/home/tito/rentflow}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # the frontend repo

[[ $# -eq 0 ]] || { echo "Usage: $0"; exit 1; }

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

say "Building the admin app and the tenant portal"
cd "$ROOT"
for app in admin portal; do
  [[ -f "apps/$app/.env.production" ]] || cp "apps/$app/.env.production.example" "apps/$app/.env.production"
done
pnpm install --frozen-lockfile
pnpm --filter @rentflow/admin --filter @rentflow/portal build

for app in admin portal; do
  say "Uploading $app → $SERVER:$REMOTE/frontend/apps/$app/dist"
  ssh "$SERVER" "mkdir -p $REMOTE/frontend/apps/$app/dist"
  rsync -az --delete "apps/$app/dist/" "$SERVER:$REMOTE/frontend/apps/$app/dist/"
done

say "Done"
echo "Admin:  https://admin.rentflow.codepasstech.top"
echo "Tenant: https://rentflow.codepasstech.top"
