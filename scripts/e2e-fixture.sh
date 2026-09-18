#!/usr/bin/env bash
# Copies the end-to-end fixture set out of production, read-only: the set row, its first twenty
# English cards, four more with names none of those twenty carry, and the TCGplayer prices for
# whichever of those cards TCGplayer has a product for. Run by hand from a machine linked to the
# project; the result is committed as e2e/fixtures/catalogue.json.
#
# The first twenty are verbatim and their order never changes: e2e/support.ts's card(index) is
# this list, and every spec names its cards by index. The four after them skip a name already in
# the fixture, because the suite's locators read a card off the set page by its name and its
# number ("Smoliv #021, not in your collection"), and a second Smoliv would make e2e/sheet.spec.ts's
# card 19 match two tiles. Inside the first twenty three cards do share a name (the Tarountulas at
# 15 to 17): those are load-bearing as they are, so the rule starts after them.
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
[[ "$SET" =~ ^[a-z0-9.-]+$ ]] || { echo "bad set id" >&2; exit 1; }
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$API_DIR"

CARDS_JSON="$(supabase db query --linked -o json "
select json_build_object(
  'sets', (select json_agg(s) from catalogue_sets s where s.id = '$SET' and s.language = 'en'),
  'cards', (select json_agg(c order by c.number_order, c.local_id) from (
      select * from catalogue_cards where set_id = '$SET' and language = 'en'
      order by number_order nulls last, local_id limit 60) c)
) as fixture")"

# The CLI wraps the row in {boundary, rows: [{fixture: {...}}], warning}; unwrap it, cut the window
# down to the first KEEP cards plus EXTRA more with names none of those carry, and drop the
# generated "search" and "number_order" columns from each card (inserting either fails: neither
# is a real column, both are `generated always as (...) stored`).
CARDS_ONLY="$(KEEP=20 EXTRA=4 node -e '
const raw = JSON.parse(require("fs").readFileSync(0, "utf8"));
const fixture = raw.rows[0].fixture;
const keep = Number(process.env.KEEP);
const extra = Number(process.env.EXTRA);
const all = fixture.cards ?? [];
const chosen = all.slice(0, keep);
const names = new Set(chosen.map((c) => c.name));
for (const c of all.slice(keep)) {
    if (chosen.length >= keep + extra) break;
    if (names.has(c.name)) continue;
    names.add(c.name);
    chosen.push(c);
}
if (chosen.length < keep + extra) throw new Error(`only ${chosen.length} cards with distinct enough names; widen the query`);
for (const c of chosen) {
    delete c.search;
    delete c.number_order;
}
fixture.cards = chosen;
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
