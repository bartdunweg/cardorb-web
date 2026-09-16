#!/usr/bin/env bash
# Starts what the end-to-end tests run against: a local Supabase built from the API's migrations,
# the API on :3001 and this app on :3000, both production builds. CI only (needs Docker).
# Usage: scripts/e2e-stack.sh <path to cardorb-api checkout>
set -euo pipefail

API_DIR="$(cd "$1" && pwd)"
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REVALIDATE_SECRET="e2e-revalidate"

cd "$API_DIR"
export RESEND_API_KEY="e2e-unused"

# Migration 20260915110000 hardcodes one day's price reading for about 180 cards as a production
# incident fix; it never populates catalogue_cards, because on the real database the nightly
# catalogue cron already had. This checkout's database is built from nothing, so
# 20260915161000's own guard ("card_price_months ids in no catalogue") then fails on exactly
# those ids. A placeholder row per id, timestamped between the two, satisfies the guard without
# touching cardorb-api: this file never leaves the CI checkout.
cat > "$API_DIR/supabase/migrations/20260915115000_e2e_placeholder_catalogue.sql" <<'SQL'
-- Added by cardorb-web's scripts/e2e-stack.sh, not part of cardorb-api. See its comment.
insert into public.catalogue_cards (id, language, set_id, local_id, name, set_name)
select distinct m.tcg_id, 'en', 'e2e-placeholder', m.tcg_id, m.tcg_id, 'e2e placeholder'
from public.card_price_months m
where not exists (select 1 from public.catalogue_cards k where k.id = m.tcg_id)
on conflict do nothing;
SQL

supabase start -x studio,imgproxy,realtime,edge-runtime,logflare,vector,supavisor,mailpit,postgres-meta
eval "$(supabase status -o env)"

cat > "$WEB_DIR/e2e/.stack.env" <<EOF
SUPABASE_URL=$API_URL
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
EOF

SUPABASE_URL="$API_URL" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" node "$WEB_DIR/e2e/seed.ts"

export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"

(
    export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
    export ALLOWED_ORIGINS="http://localhost:3000"
    export NEXT_PUBLIC_SITE_URL="http://localhost:3001"
    export WEB_REVALIDATE_URL="http://localhost:3000/api/revalidate"
    export WEB_REVALIDATE_SECRET="$REVALIDATE_SECRET"
    export CRON_SECRET="e2e-cron"
    CI=true pnpm install --frozen-lockfile
    pnpm build
    nohup pnpm exec next start -p 3001 > "$WEB_DIR/e2e-api.log" 2>&1 &
)

(
    cd "$WEB_DIR"
    export CARDORB_API_URL="http://localhost:3001/api/v1"
    export NEXT_PUBLIC_SITE_URL="http://localhost:3000"
    export REVALIDATE_SECRET
    pnpm build
    nohup pnpm exec next start -p 3000 > "$WEB_DIR/e2e-web.log" 2>&1 &
)

wait_for() {
    for _ in $(seq 1 60); do
        if curl -sf -o /dev/null "$1"; then echo "up: $1"; return 0; fi
        sleep 2
    done
    echo "not up after 120 s: $1" >&2
    return 1
}
wait_for "http://localhost:3001/api/v1/health"
wait_for "http://localhost:3000/login"
