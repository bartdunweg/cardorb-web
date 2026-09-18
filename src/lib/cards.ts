import { api } from "@/lib/api";
import { type Card, type FilterCounts, cardFromItem, cardsAnswer, facetsAnswer, statsAnswer } from "@/lib/api-shapes";
import type { DexCardLike } from "@/lib/dex-groups";
import { type Facets, facetsFrom } from "@/lib/facets";
import { perUser } from "@/lib/user-cache";

export type { Card, PublicCard } from "@/lib/api-shapes";
// The type lives in `@/lib/facets` with NO_FACETS and facetsFrom, which a client component has to
// be able to import: this module reaches the API and so the session, and cannot cross that line.
export type { Facets } from "@/lib/facets";

/**
 * The sets and rarities you hold a card of, for a rule's fields and the search's chips. Five
 * minutes per person. The loader takes the token it is handed: inside the cache there is no
 * request to read a session from, and a read that asks for one throws before the API is called.
 */
export const getFacets = (): Promise<Facets> =>
    perUser("stats", "facets", async (token) => {
        const { facets } = await api("/cards", { token, params: { owned: true, limit: 1 }, schema: facetsAnswer });
        return facetsFrom(facets);
    });

/** Which cards a list asks for: the binder, the search, the sort and the filters. Plain data, so a page can hand it to the client for the next batch. */
export type CardFilter = {
    /** False from a caller that will not read the facets (a further batch on scroll): the API skips that pass. */
    facets?: boolean;
    /**
     * False from a caller that counts the cards rather than drawing them: the API leaves the
     * printings' own pictures off, and skips the read behind them. That read is one query per
     * catalogue over the page's card ids, which is 67 ms on a batch of forty-eight and 1,191 ms
     * on a read of the whole collection (measured 2026-09-18, 1,922 cards). `print_image_url` is
     * then null, which is what a copy whose printing has no picture of its own already carries,
     * so anything drawing one falls back to the card's scan.
     */
    pictures?: boolean;
    q?: string;
    collectionId?: string;
    favoritesOnly?: boolean;
    wishlist?: boolean;
    sort?: "name" | "price" | "added" | "dex" | "change";
    order?: "asc" | "desc";
    /** `sort: "change"` only: the window's first and last day, yyyy-mm-dd. */
    from?: string;
    to?: string;
    set?: string | string[];
    rarity?: string | string[];
    /** Only the cards whose illustration covers the whole card; the API works it out per set. */
    fullArt?: boolean;
    /** A generation, or several (a card from any), whole, as the catalogue names its series. */
    gen?: string | string[];
    /** An energy type, or several (a card of any), whole, as the catalogue names it. */
    type?: string | string[];
    /** A copy's condition, or several (a copy in any), whole. */
    condition?: string | string[];
    /** A copy's finish, or several. */
    finish?: string | string[];
    /** A copy's language as its code, or several; a copy with none is English. */
    language?: string | string[];
    /** A card number, whole; with `set` it names one card's every row. */
    number?: string;
    /** Only the owned printings held more than once; the API counts them over the whole collection. */
    duplicates?: boolean;
};

/**
 * Cards per batch of a list. The first batch comes with the page, the rest as the reader scrolls
 * (`CardsList`). Forty-eight fills two to three screens on any width and keeps the first answer,
 * and the pictures it asks for, small.
 */
export const LIST_BATCH = 48;

/** What one read of a list answers: a batch of cards and the numbers about the whole of it. */
export type CardList = Awaited<ReturnType<typeof getMyCards>>;

// One batch of the signed-in person's cards, from the API (R-DATA-003). `wishlist` picks the
// wishlist (`owned=false`) over the collection; the API sorts by set, then number.
export async function getMyCards({
    limit = LIST_BATCH,
    offset = 0,
    q,
    collectionId,
    favoritesOnly,
    wishlist = false,
    sort,
    order,
    from,
    to,
    set,
    rarity,
    fullArt,
    gen,
    type,
    condition,
    finish,
    language,
    number,
    duplicates,
    facets: wantFacets,
    pictures: wantPictures,
    counts: wantCounts = false,
    token,
}: CardFilter & {
    limit?: number;
    offset?: number;
    token?: string;
    /** Ask for how many each filter choice would leave (the Filters sheet); off for a list. */
    counts?: boolean;
} = {}): Promise<{
    cards: Card[];
    total: number;
    /** The list as a person counts it: an owned copy `quantity` times, a wish once. Null from an API before it said. */
    copies: number | null;
    /** What the whole filtered list is worth, in euros; null from an API that does not answer it yet. */
    value: number | null;
    /** Copies in the filtered list without a price. */
    unpriced: number;
    /** Of those, the copies shown at a lowest listing and left out of `value`. */
    listed: number;
    /**
     * The catalogue could not be reached: these are the rows alone, with no scan and no price.
     * A page says so, because a collection with no pictures is otherwise read as a broken app.
     */
    catalogueUnavailable: boolean;
    /** The sets, rarities, generations and types held, over the whole collection whatever the filters: what the menus offer. */
    facets: Facets;
    /** Per filter choice, what it would leave; null unless asked for, or from an API that does not answer it yet. */
    counts: FilterCounts | null;
}> {
    // The first batch of a list is the read every list page waits on; per person and five
    // minutes it is a cache read instead of a round trip, and a write drops it with the rest
    // (forgetMine). Further batches and the odd sizes (a count, a whole Pokédex) go straight.
    const key =
        offset === 0 && limit === LIST_BATCH
            ? `cards:${JSON.stringify([q, collectionId, favoritesOnly, wishlist, sort, order, from, to, set, rarity, fullArt, gen, type, condition, finish, language, number, duplicates, wantFacets, wantPictures])}`
            : null;
    const read = async (token?: string) => {
        const { cards, total, copies, facets, value, unpriced, listed, catalogueUnavailable, counts } = await api("/cards", {
            schema: cardsAnswer,
            token,
            params: {
                q: q?.trim() || undefined,
                owned: !wishlist,
                favorite: favoritesOnly ? true : undefined,
                collection: collectionId,
                sort,
                order,
                ...(sort === "change" ? { from, to } : {}),
                set,
                rarity,
                fullArt: fullArt ? 1 : undefined,
                gen,
                type,
                condition,
                finish,
                language,
                number,
                duplicates: duplicates ? 1 : undefined,
                // The API skips its facets pass when told nobody will read them.
                facets: wantFacets === false ? 0 : undefined,
                // And the printings' pictures, likewise, when nobody will draw them.
                pictures: wantPictures === false ? 0 : undefined,
                counts: wantCounts ? 1 : undefined,
                limit,
                offset,
            },
        });
        return {
            cards: cards.map(cardFromItem),
            total,
            copies: copies ?? null,
            value: value ?? null,
            unpriced: unpriced ?? 0,
            listed: listed ?? 0,
            catalogueUnavailable: catalogueUnavailable === true,
            facets: facetsFrom(facets),
            counts: counts ?? null,
        };
    };
    // A caller inside the per-user cache (getPokedexCount) hands the token in: the session cannot
    // be read there. Such a read is never the first batch, so it is not cached twice.
    return key && !token ? perUser("lists", key, read) : read(token);
}

export type CardStats = {
    /** Printings held: a card held twice is one of these, and one row in every list. */
    owned: number;
    /** Cards held, a duplicate counting twice: what the Owned tile says. */
    copies: number;
    wishlist: number;
    favorites: number;
    /** Today's value of every copy held, in euros. A whole-collection figure the API adds up (R-DATA-006 there). */
    value: number;
    /** Copies held that carry no price and add nothing to `value`. */
    unpriced: number;
};

export type ApiStats = { cards: number; copies: number; wishlist: number; favorites: number; sets: number; value: number; unpriced: number };

// Kept five minutes per person: the layout and a page both ask, and every write drops the cache.
export const getStats = () => perUser("stats", "stats", async (token) => (await api("/stats", { token, schema: statsAnswer })).stats);

// The dashboard's numbers. "Owned" counts cards (rows), as the page always has.
export async function getCardStats(): Promise<CardStats> {
    const stats = await getStats();
    return { owned: stats.cards, copies: stats.copies, wishlist: stats.wishlist, favorites: stats.favorites, value: stats.value, unpriced: stats.unpriced };
}

/**
 * The whole of a list, for a binder shown as a Pokédex: the slots need every card, not a page.
 * One request of up to 2,000 (the API's ceiling for an owner); should a collection outgrow it,
 * the rest follows in pages of the same size.
 */
export async function getAllMyCards(filter: CardFilter, token?: string) {
    const PAGE = 2000;
    const first = await getMyCards({ ...filter, limit: PAGE, offset: 0, token });
    const got = first.cards.length;
    if (got >= first.total || got === 0) return first;
    const pages = Math.ceil((first.total - got) / got);
    const rest = await Promise.all(Array.from({ length: pages }, (_, i) => getMyCards({ ...filter, limit: PAGE, offset: got * (i + 1), token })));
    return { ...first, cards: [...first.cards, ...rest.flatMap((p) => p.cards)] };
}

/** What a Pokédex slot reads of a card (`DexCardLike`), and nothing more. */
const DEX_FIELDS = [
    "id",
    "name",
    "number",
    "species_id",
    "species_ids",
    "rarity",
    "image_url",
    "image_high_url",
    "set",
    "set_name",
    "quantity",
    "price",
    "dex_face",
] as const;

export type DexCards = { cards: DexCardLike[]; facets: Facets };

/** A card cut down to what `groupByDex` reads. */
export const dexFields = (card: Card): DexCardLike => {
    const out: Record<string, unknown> = {};
    for (const field of DEX_FIELDS) if (field in card) out[field] = card[field];
    return out as DexCardLike;
};

/** The key a Pokédex binder's cards are kept under: the filter the page asked with, whole. */
export const dexCardsKey = (filter: CardFilter) => `dex-cards:v1:${JSON.stringify(filter)}`;

/**
 * Every card of a binder shown as a Pokédex, kept per person in the lists scope, which a card write
 * and a binder write both forget (`cache-scopes.ts`), and so does a new face (`dexFace`). Each visit
 * read up to two thousand cards from the API with no cache in front of it.
 *
 * Only the fields a slot reads are kept, with the facets the page takes from the same answer: a whole
 * Card is about 900 bytes, so two thousand of them came to 1.75 MB, at the Data Cache's 2 MB ceiling,
 * where an entry is silently not kept. Cut down it is about 370 bytes a card (730 KB for 2,000).
 *
 * The binder's Pokédex setting is not in the key: it is applied after the read (`groupByDex`), so
 * the kept cards are the same whatever it says, and changing it is a binder write, which forgets them.
 *
 * Each miss logs the entry's serialized size, so a collection growing towards the ceiling shows in
 * the logs before its entry quietly stops being kept.
 */
export const getDexCards = (filter: CardFilter): Promise<DexCards> =>
    perUser("lists", dexCardsKey(filter), async (token) => {
        // No pictures, whatever the filter says: DEX_FIELDS keeps no `print_image_url`, so the
        // printings' pictures of a whole collection were read and then thrown away.
        const all = await getAllMyCards({ ...filter, pictures: false }, token);
        const kept: DexCards = { cards: all.cards.map(dexFields), facets: all.facets };
        logDexEntrySize(kept);
        return kept;
    });

/** The Data Cache keeps no entry over 2 MB; past this share of it the log line says so. */
const DATA_CACHE_LIMIT_BYTES = 2 * 1024 * 1024;
const NEAR_LIMIT = 0.75;

export function logDexEntrySize(entry: DexCards): number {
    const bytes = new TextEncoder().encode(JSON.stringify(entry)).length;
    const share = bytes / DATA_CACHE_LIMIT_BYTES;
    const line = `[cache] dex-cards entry ${bytes} bytes, ${entry.cards.length} cards, ${Math.round(share * 100)}% of the 2 MB limit`;
    if (share >= NEAR_LIMIT) console.warn(`${line}: near the limit, past it the entry is not kept`);
    else console.info(line);
    return bytes;
}
