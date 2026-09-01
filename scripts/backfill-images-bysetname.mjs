// Backfill image_url / tcg_id / pokedex_numbers for cards that have no image, by matching their
// set_name to a pokemontcg.io set and then matching on card number. Catches real sets that were
// released after the first image backfill (e.g. Ascended Heroes = me2pt5).
//
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local. Run: node scripts/backfill-images-bysetname.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const API = "https://api.pokemontcg.io/v2";
async function api(path) {
    for (let i = 0; i < 8; i++) {
        try {
            const res = await fetch(`${API}${path}`);
            if (res.ok) return await res.json();
        } catch {
            // retry
        }
        await new Promise((r) => setTimeout(r, 1500));
    }
    return null;
}

// 1. Map every API set name (lowercased) → set id.
const setsJson = await api("/sets?pageSize=250");
const setIdByName = new Map();
for (const s of setsJson?.data ?? []) setIdByName.set(s.name.toLowerCase(), s.id);
console.log(`Loaded ${setIdByName.size} API sets.`);

// 2. Our cards without an image, grouped by set_name.
let rows = [];
for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
        .from("cards")
        .select("id, set_name, number")
        .is("image_url", null)
        .range(from, from + 999);
    if (error) throw error;
    rows = rows.concat(data);
    if (data.length < 1000) break;
}
const bySet = new Map();
for (const r of rows) {
    if (!r.set_name || !r.number) continue;
    if (!bySet.has(r.set_name)) bySet.set(r.set_name, []);
    bySet.get(r.set_name).push(r);
}
console.log(`${rows.length} cards without an image across ${bySet.size} sets.`);

let filled = 0;
const skipped = [];
for (const [setName, cards] of bySet) {
    const setId = setIdByName.get(setName.toLowerCase());
    if (!setId) {
        skipped.push(`${setName} (no API set, ${cards.length})`);
        continue;
    }

    // Fetch the whole API set, map number → {image, dex, num}. Keyed by a leading-zero-stripped
    // number: our import zero-pads ("087") while the API does not ("87").
    const norm = (n) => String(n).replace(/^0+/, "") || "0";
    const byNumber = new Map();
    for (let page = 1; ; page++) {
        const json = await api(`/cards?q=set.id:${setId}&page=${page}&pageSize=250`);
        const data = json?.data ?? [];
        for (const c of data) byNumber.set(norm(c.number), { image: c.images?.small ?? null, dex: c.nationalPokedexNumbers ?? null, num: String(c.number) });
        if (data.length < 250) break;
    }

    let matched = 0;
    for (const card of cards) {
        const hit = byNumber.get(norm(card.number));
        if (!hit?.image) continue;
        const { error } = await supabase
            .from("cards")
            .update({ image_url: hit.image, tcg_id: `${setId}-${hit.num}`, pokedex_numbers: hit.dex })
            .eq("id", card.id);
        if (error) throw error;
        filled++;
        matched++;
    }
    console.log(`${setName} → ${setId}: matched ${matched}/${cards.length}`);
}

console.log(`\nFilled ${filled} cards.`);
if (skipped.length) console.log(`No API set for: ${skipped.join(", ")}`);
