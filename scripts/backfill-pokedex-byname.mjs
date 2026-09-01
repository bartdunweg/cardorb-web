// Fallback backfill: fill cards.pokedex_numbers by matching the card NAME to a National Pokédex
// number, for cards the id-based backfill couldn't resolve (promos, fan sets, id mismatches).
//
// Source of truth for name→number: PokeAPI pokemon-species (species id == national dex number).
// Safe by design: a card is only filled if EVERY name part resolves to a species; Trainers/Energy
// don't match any species and are left null. Tag-team names ("A & B GX") resolve to both numbers.
// Regional forms (Alolan/Galarian/…) share the base species' national number, so a leading-word
// strip lands on the correct number.
//
// Run: node scripts/backfill-pokedex-byname.mjs   (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// --- name → dex map from PokeAPI ---
const res = await fetch("https://pokeapi.co/api/v2/pokemon-species?limit=100000");
const species = (await res.json()).results;
const dexByName = new Map();
for (const s of species) {
    const id = Number(s.url.split("/").filter(Boolean).pop());
    if (id >= 1 && id <= 1025) dexByName.set(s.name, id);
}
console.log(`Loaded ${dexByName.size} species names from PokeAPI.`);

const slug = (s) =>
    s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/♀/g, " f")
        .replace(/♂/g, " m")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

const SUFFIX = new Set(["ex", "gx", "v", "vmax", "vstar", "vunion", "break", "prime", "star", "legend", "lvx", "lv", "x", "delta", "prism", "tag"]);

// Resolve one name part (already split off tag-teams) to a dex number, or null.
function resolvePart(part) {
    let words = part.trim().split(/\s+/);
    while (words.length > 1 && SUFFIX.has(words[words.length - 1].toLowerCase().replace(/[^a-z]/g, ""))) words.pop();
    for (let i = 0; i < words.length; i++) {
        const key = slug(words.slice(i).join(" "));
        if (dexByName.has(key)) return dexByName.get(key);
    }
    return null;
}

// Resolve a full card name to its dex numbers, or null if any part is unresolved.
function resolveName(name) {
    const parts = name.split(/\s*&\s*|\s+and\s+/i);
    const nums = [];
    for (const part of parts) {
        const n = resolvePart(part);
        if (n == null) return null;
        if (!nums.includes(n)) nums.push(n);
    }
    return nums.length ? nums : null;
}

// --- read all cards still missing a number (paginate past the 1000-row cap) ---
let cards = [];
for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
        .from("cards")
        .select("id, name")
        .is("pokedex_numbers", null)
        .range(from, from + 999);
    if (error) throw error;
    cards = cards.concat(data);
    if (data.length < 1000) break;
}
console.log(`${cards.length} cards still without a number.`);

// Group by resolved signature to update in few queries.
const groups = new Map();
let unresolved = 0;
for (const card of cards) {
    const nums = resolveName(card.name);
    if (!nums) {
        unresolved++;
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
        const { error } = await supabase.from("cards").update({ pokedex_numbers: nums }).in("id", batch);
        if (error) throw error;
        updated += batch.length;
    }
}
console.log(`Filled ${updated} cards by name. ${unresolved} left null (Trainers/Energy/unresolvable).`);
