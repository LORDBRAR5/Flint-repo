#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail(){ echo "[FAIL] $*" >&2; exit 1; }
need(){ command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"; }
need docker
need openssl

[[ -f .env ]] || fail ".env is missing"
[[ -n "${DASHBOARD_URL:-$(grep '^DASHBOARD_URL=' .env | cut -d= -f2-)" ]] || fail "DASHBOARD_URL is missing"
for key in POSTGRES_PASSWORD ATXCLOUD_INTERNAL_SECRET ATXCLOUD_COOKIE_SECRET DISCORD_BOT_TOKEN DISCORD_CLIENT_ID DISCORD_CLIENT_SECRET DISCORD_REDIRECT_URI DISCORD_GUILD_ID STAFF_ROLE_IDS PTERODACTYL_URL PTERODACTYL_APPLICATION_KEY PTERODACTYL_CLIENT_KEY; do
  value="$(grep -E "^${key}=" .env | cut -d= -f2- || true)"
  [[ -n "$value" ]] || fail "$key is not configured"
done

if grep -Eq 'CHANGE_ME|GENERATE_|YOUR_' .env; then fail ".env still contains placeholder secrets"; fi

sudo docker compose config >/dev/null || fail "docker compose configuration is invalid"
sudo docker compose ps

if sudo docker compose ps --status running --services | grep -qx db; then
  sudo docker compose exec -T db pg_isready -U atxcloud -d atxcloud >/dev/null || fail "database readiness failed"
fi

curl -fsS --max-time 10 "http://127.0.0.1:${PORT:-4000}/health" >/dev/null || fail "API health check failed"

echo "[PASS] Static production configuration checks passed."
echo "This script intentionally does not claim external OAuth, Discord, Pterodactyl, or Cloudflare end-to-end success; those require the configured live services."
