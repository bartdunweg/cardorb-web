#!/usr/bin/env bash
# Copies the end-to-end fixture set out of production, read-only: the set row, its first twelve
# English cards and the TCGplayer prices for whichever of those cards TCGplayer has a product for.
# Run by hand from a machine linked to the project; the result is committed as
# e2e/fixtures/catalogue.json.
#
# English catalogue_cards never carries tcgplayer_product_id (checked 2026-09-17: 16,376 rows
# have it and every one is language 'ja'). The live app looks an English card's TCGplayer product
# up instead in the API's checked-in src/lib/core/tcgplayer-ids.generated.json
# (card-printings.ts), keyed "<setId>-<localId>". This script reads that same file from the API
# checkout so the seeded tcgplayer_prices rows line up with what the running app will ask for.
#
# Usage: scripts/e2e-fixture.sh <path to cardorb-api checkout> [set id, default sv01]
set -euo pipefail

API_DIR="$(cd "$1" && pwd)"
SET="${2:-sv01}"
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$API_DIR"

CARDS_JSON="$(supabase db query --linked -o json "
select json_build_object(
  'sets', (select json_agg(s) from catalogue_sets s where s.id = '$SET' and s.language = 'en'),
  'cards', (select json_agg(c order by c.number_order, c.local_id) from (
      select * from catalogue_cards where set_id = '$SET' and language = 'en'
      order by number_order nulls last, local_id limit 12) c)
) as fixture")"

# The CLI wraps the row in {boundary, rows: [{fixture: {...}}], warning}; unwrap it and drop the
# generated "search" and "number_order" columns from each card (inserting either fails: neither
# is a real column, both are `generated always as (...) stored`).
CARDS_ONLY="$(node -e '
const raw = JSON.parse(require("fs").readFileSync(0, "utf8"));
const fixture = raw.rows[0].fixture;
for (const c of fixture.cards ?? []) {
    delete c.search;
    delete c.number_order;
}
process.stdout.write(JSON.stringify(fixture));
' <<<"$CARDS_JSON")"

# Resolve each seeded card's TCGplayer product id from the API's own generated mapping, then
# fetch tcgplayer_prices for exactly those product ids in a second, read-only query.
PRODUCT_IDS="$(node -e '
const fixture = JSON.parse(process.argv[1]);
const ids = require(process.argv[2]);
const setId = process.argv[3];
const productIds = (fixture.cards ?? [])
    .map((c) => ids[`${setId}-${c.local_id}`]?.productId)
    .filter((id) => typeof id === "number");
process.stdout.write([...new Set(productIds)].join(","));
' "$CARDS_ONLY" "$API_DIR/src/lib/core/tcgplayer-ids.generated.json" "$SET")"

if [ -n "$PRODUCT_IDS" ]; then
    PRICES_JSON="$(supabase db query --linked -o json "
select coalesce(json_agg(p), '[]'::json) as fixture
from tcgplayer_prices p where p.product_id in ($PRODUCT_IDS)")"
else
    PRICES_JSON='{"rows":[{"fixture":[]}]}'
fi

node -e '
const cards = JSON.parse(process.argv[1]);
const pricesRaw = JSON.parse(process.argv[2]);
const prices = pricesRaw.rows[0].fixture;
process.stdout.write(JSON.stringify({ sets: cards.sets, cards: cards.cards, prices }, null, 2) + "\n");
' "$CARDS_ONLY" "$PRICES_JSON" > "$WEB_DIR/e2e/fixtures/catalogue.json"

echo "wrote $WEB_DIR/e2e/fixtures/catalogue.json"
node -e 'const f=require(process.argv[1]);console.log(f.sets.length, f.cards.length, f.prices.length)' "$WEB_DIR/e2e/fixtures/catalogue.json"
