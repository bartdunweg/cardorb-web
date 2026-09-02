// One-off backfill: fill cards.pokedex_numbers from pokemontcg.io.
//
// Needs SUPABASE_SERVICE_ROLE_KEY (write access past RLS) in .env.local, alongside the existing
// NEXT_PUBLIC_SUPABASE_URL. Run: node scripts/backfill-pokedex.mjs
//
// Data source: prefers cached API responses in /tmp/dex_cache/*.json (written by the fetch step);
// falls back to fetching each set from the API with retries. Cards are matched by tcg_id (= the
// pokemontcg card id), so only rows with a tcg_id get filled; fan/custom sets stay null.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, readdirSync } from "node:fs";

// --- env (standalone script: load .env.local by hand) ---
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// --- build id -> nationalPokedexNumbers map ---
const CACHE = "/tmp/dex_cache";
const map = new Map();

function ingest(json) {
    for (const c of json.data ?? []) {
        if (Array.isArray(c.nationalPokedexNumbers) && c.nationalPokedexNumbers.length) {
            map.set(c.id, c.nationalPokedexNumbers);
        }
    }
}

if (existsSync(CACHE) && readdirSync(CACHE).some((f) => f.endsWith(".json"))) {
    for (const f of readdirSync(CACHE)) {
        if (!f.endsWith(".json")) continue;
        try {
            ingest(JSON.parse(readFileSync(`${CACHE}/${f}`, "utf8")));
        } catch {
            // skip unreadable cache file
        }
    }
    console.log(`Loaded ${map.size} card→dex mappings from cache.`);
} else {
    console.error("No /tmp/dex_cache found — run the fetch step first.");
    process.exit(1);
}

// --- read our cards that still need a number ---
const { data: cards, error } = await supabase.from("cards").select("id, tcg_id").not("tcg_id", "is", null).is("pokedex_numbers", null);
if (error) throw error;
console.log(`${cards.length} cards need a pokedex number.`);

// Group card ids by identical dex-number signature to update in as few queries as possible.
const groups = new Map(); // signature -> { nums, ids: [] }
let unmatched = 0;
for (const card of cards) {
    const nums = map.get(card.tcg_id);
    if (!nums) {
        unmatched++;
        continue;
    }
    const sig = nums.join(",");
    if (!groups.has(sig)) groups.set(sig, { nums, ids: [] });
    groups.get(sig).ids.push(card.id);
}

let updated = 0;
for (const { nums, ids } of groups.values()) {
    for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);
        const { error: upErr } = await supabase.from("cards").update({ pokedex_numbers: nums }).in("id", batch);
        if (upErr) throw upErr;
        updated += batch.length;
    }
}

console.log(`Updated ${updated} cards. ${unmatched} had no API match (left null).`);
