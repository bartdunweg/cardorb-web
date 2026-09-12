import { z } from "zod";
import { type PokemonCard, absoluteImage } from "@/lib/api-shapes";
import { type CardGroup, type SpeciesTable, cardGroup } from "@/lib/card-group";
import { bestBand } from "@/lib/name-rank";

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

/** Each card's heading, worked out once per catalogue and species list and kept. */
const groupings = new WeakMap<CatalogueIndex, { table: SpeciesTable; groups: CardGroup[] }>();
const groupsOf = (index: CatalogueIndex, table: SpeciesTable): CardGroup[] => {
    const cached = groupings.get(index);
    if (cached?.table === table) return cached.groups;
    const groups = index.cards.map((card) => cardGroup(card[3], table));
    groupings.set(index, { table, groups });
    return groups;
};

/**
 * The hits for a term and the chips, the way the API's search reads them: every word must be
 * in the name, the number or the set name; a word that is an energy type filters on type; a
 * set chip matches the set's name whole. A hit carries no ownership and no price yet: those are
 * `lookupCards`'s to attach.
 *
 * What the name begins with comes first (`name-rank.ts`), then what a word inside it begins
 * with, then the rest: the document is newest set first, which had "char" answering Pecharunt ex
 * above every Charizard. Inside a band the document's order stands, so a name is still answered
 * newest printing first.
 *
 * Given the species, a typed term answers by Pokémon (`card-group.ts`): every printing of one
 * under one heading, the headings in the same bands (a heading takes the best band of its name
 * and its cards' names, and a heading that is the whole term goes before them all), and inside a
 * heading the document's order. Each hit says its heading and how many the whole search holds
 * under it. The chips alone (a set, a type) are a shelf to read in order, and stay ungrouped.
 */
export function searchIndex(
    index: CatalogueIndex,
    term: string,
    filters: IndexFilters = {},
    page = 1,
    species?: SpeciesTable | null,
): { items: PokemonCard[]; total: number } {
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
    // Banded by the name, the document's order kept inside a band. Sorted whole rather than per
    // page, so page two of a search is the next twenty of one order and not a second one.
    const from = (Math.max(1, page) - 1) * INDEX_PAGE_SIZE;
    if (words.length && species?.size) {
        const groups = groupsOf(index, species);
        const whole = words.join(" ");
        // Per heading: its best band, where it first appears in the document, and how many it holds.
        const heads = new Map<string, { band: number; first: number; size: number }>();
        for (const i of matched) {
            const group = groups[i]!;
            const cardBand = bestBand(index.cards[i]![3], words);
            const head = heads.get(group.key);
            if (head) {
                head.band = Math.min(head.band, cardBand);
                head.size++;
            } else {
                const titleBand = group.title.toLowerCase() === whole ? -1 : bestBand(group.title, words);
                heads.set(group.key, { band: Math.min(titleBand, cardBand), first: i, size: 1 });
            }
        }
        const headOf = (i: number) => heads.get(groups[i]!.key)!;
        matched.sort((a, b) => headOf(a).band - headOf(b).band || headOf(a).first - headOf(b).first || a - b);
        const items = matched.slice(from, from + INDEX_PAGE_SIZE).map((i) => ({
            ...hitOf(index, index.cards[i]!),
            group: { ...groups[i]!, size: headOf(i).size },
        }));
        return { items, total: matched.length };
    }
    if (words.length) matched.sort((a, b) => bestBand(index.cards[a]![3], words) - bestBand(index.cards[b]![3], words) || a - b);

    return { items: matched.slice(from, from + INDEX_PAGE_SIZE).map((i) => hitOf(index, index.cards[i]!)), total: matched.length };
}

/** A hit as the palette draws one, before the API has said whether it is yours. */
function hitOf(index: CatalogueIndex, card: CatalogueIndex["cards"][number]): PokemonCard {
    const [id, setId, number, name, rarity, types, own] = card;
    const set = index.sets[setId];
    const stored = card.length > 6 ? (own ?? null) : set?.image ? `${set.image}/${number}` : null;
    /* Most cards carry a scan's folder, and the size is the reader's: `${stem}/low.webp`. A card
       TCGdex has no scan of carries a whole file instead, the second catalogue's, which the API
       resolved while it filled the copy and of which there is one size. A path rather than a
       whole address is the API's cover proxy, and it is a file too. */
    const file = stored && (stored.startsWith("/") || /\.(webp|png|jpe?g)(\?|$)/i.test(stored));
    return {
        id,
        tcgId: id,
        name,
        set: set?.name ?? setId,
        number,
        rarity,
        image: stored ? absoluteImage(file ? stored : `${stored}/low.webp`) : null,
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
