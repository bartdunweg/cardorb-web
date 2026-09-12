import { z } from "zod";
import { type PokemonCard } from "@/lib/api-shapes";

/**
 * The English catalogue as the browser holds it, and a search over it.
 *
 * A search that asked a server was 0.7 to 1.0 s of round trips with the query itself at 1 ms
 * (measured 2026-09-11). So the API hands the whole catalogue over once a day as one compact
 * document (`GET /v1/catalog/index`, 23,000 cards, a few hundred kilobytes compressed) and
 * the typing is answered here, in memory, before a request could have left. What is personal
 * (owned, wishlist) or daily (price) is asked afterwards, for the twenty hits on screen.
 *
 * No directive: read from the client module that fetches the document and from tests.
 */

/** One card: id, set id, number, name, rarity, types, and a seventh element only where the scan is not at the set's folder. */
const indexCardSchema = z.tuple([z.string(), z.string(), z.string(), z.string(), z.string().nullable(), z.array(z.string())]).rest(z.string().nullable());

export const catalogueIndexSchema = z.object({
    version: z.string(),
    sets: z.record(
        z.string(),
        z.object({
            name: z.string(),
            series: z.string().nullable(),
            date: z.string().nullable(),
            /** The set's scan folder; a card's scan is `${image}/${number}/low.webp`. */
            image: z.string().nullable(),
        }),
    ),
    cards: z.array(indexCardSchema),
});
export type CatalogueIndex = z.infer<typeof catalogueIndexSchema>;

/** What the palette's chips narrow by, on the English shelf. */
export type IndexFilters = { set?: string; type?: string };

/** A page of hits, twenty as the API pages, and how many the whole search matched. */
export const INDEX_PAGE_SIZE = 20;

/** The energy types a card can carry, as TCGdex names them: a typed word that is one is the type filter, not a name. */
const ENERGY_TYPES = ["Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Darkness", "Metal", "Fairy", "Dragon", "Colorless"];
const MAX_WORDS = 6;
const energyType = (word: string) => ENERGY_TYPES.find((t) => t.toLowerCase() === word.toLowerCase());

/** The text a word is matched against: name, number and set name, lowercased, built once per card and kept. */
const haystacks = new WeakMap<CatalogueIndex, string[]>();
const haystackOf = (index: CatalogueIndex): string[] => {
    let cached = haystacks.get(index);
    if (!cached) {
        cached = index.cards.map(([, setId, number, name]) => `${name} ${number} ${index.sets[setId]?.name ?? setId}`.toLowerCase());
        haystacks.set(index, cached);
    }
    return cached;
};

/**
 * The hits for a term and the chips, the way the API's search reads them: every word must be
 * in the name, the number or the set name; a word that is an energy type filters on type; a
 * set chip matches the set's name whole. The document is newest set first, by number within
 * one, and the hits keep that order. A hit carries no ownership and no price yet: those are
 * `lookupCards`'s to attach.
 */
export function searchIndex(index: CatalogueIndex, term: string, filters: IndexFilters = {}, page = 1): { items: PokemonCard[]; total: number } {
    const words: string[] = [];
    let type = filters.type ? (energyType(filters.type) ?? filters.type) : undefined;
    for (const word of term.trim().split(/\s+/).filter(Boolean).slice(0, MAX_WORDS)) {
        const energy = energyType(word);
        if (energy && !type) type = energy;
        else words.push(word.toLowerCase());
    }
    if (!words.length && !type && !filters.set) return { items: [], total: 0 };

    const text = haystackOf(index);
    const setName = filters.set?.trim().toLowerCase();
    const matched: number[] = [];
    for (let i = 0; i < index.cards.length; i++) {
        const card = index.cards[i]!;
        if (setName && (index.sets[card[1]]?.name ?? "").toLowerCase() !== setName) continue;
        if (type && !card[5].includes(type)) continue;
        const hay = text[i]!;
        let all = true;
        for (const w of words)
            if (!hay.includes(w)) {
                all = false;
                break;
            }
        if (all) matched.push(i);
    }
    const from = (Math.max(1, page) - 1) * INDEX_PAGE_SIZE;
    return { items: matched.slice(from, from + INDEX_PAGE_SIZE).map((i) => hitOf(index, index.cards[i]!)), total: matched.length };
}

/** A hit as the palette draws one, before the API has said whether it is yours. */
function hitOf(index: CatalogueIndex, card: CatalogueIndex["cards"][number]): PokemonCard {
    const [id, setId, number, name, rarity, types, own] = card;
    const set = index.sets[setId];
    const stem = card.length > 6 ? (own ?? null) : set?.image ? `${set.image}/${number}` : null;
    return {
        id,
        tcgId: id,
        name,
        set: set?.name ?? setId,
        number,
        rarity,
        image: stem ? `${stem}/low.webp` : null,
        supertype: null,
        subtypes: null,
        hp: null,
        types: types.length ? types : null,
        artist: null,
        series: set?.series ?? null,
        releaseDate: null,
        setPrintedTotal: null,
        flavorText: null,
        nationalPokedexNumbers: null,
        owned: false,
        wishlist: false,
        quantity: 0,
        price: null,
    };
}
