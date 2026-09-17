#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail(){ echo "[FAIL] $*" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || fail "Docker is required"
[[ -f .env ]] || { cp .env.example .env; echo "Created .env from .env.example. Fill all required values, then run this script again."; exit 1; }

required=(POSTGRES_PASSWORD ATXCLOUD_INTERNAL_SECRET ATXCLOUD_COOKIE_SECRET DISCORD_BOT_TOKEN DISCORD_CLIENT_ID DISCORD_CLIENT_SECRET DISCORD_REDIRECT_URI DISCORD_GUILD_ID STAFF_ROLE_IDS PTERODACTYL_URL PTERODACTYL_APPLICATION_KEY PTERODACTYL_CLIENT_KEY)
for key in "${required[@]}"; do
  value="$(grep -E "^${key}=" .env | cut -d= -f2- || true)"
  [[ -n "$value" ]] || fail "$key is missing from .env"
done
if grep -Eq 'CHANGE_ME|GENERATE_|YOUR_' .env; then fail ".env contains placeholder values"; fi

sudo docker compose config >/dev/null
sudo docker compose up -d db
until sudo docker compose exec -T db pg_isready -U atxcloud -d atxcloud >/dev/null 2>&1; do sleep 2; done
sudo docker compose exec -T db psql -v ON_ERROR_STOP=1 -U atxcloud -d atxcloud < prisma/schema.sql
sudo docker compose up -d --build

for i in {1..30}; do
  if curl -fsS --max-time 3 http://127.0.0.1:4000/health >/dev/null 2>&1; then break; fi
  sleep 2
  [[ "$i" == 30 ]] && fail "API did not become healthy"
done

chmod +x scripts/*.sh || true

echo
sudo docker compose ps
echo
echo "AtxCloud control plane is installed and the API health endpoint is responding."
echo "Dashboard: ${DASHBOARD_URL:-https://dash.atxcloud.ggff.net}"
echo "The existing Cloudflare panel/node tunnel routes are not modified by this installer."
echo "Run ./scripts/verify.sh after the services are healthy."
