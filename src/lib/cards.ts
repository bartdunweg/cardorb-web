import { api } from "@/lib/api";
import { type Card, type CardItem, type FilterCounts, cardFromItem, cardsAnswer, facetsAnswer, statsAnswer } from "@/lib/api-shapes";
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
    perUser("facets", async (token) => {
        const { facets } = await api("/cards", { token, params: { owned: true, limit: 1 }, schema: facetsAnswer });
        return facetsFrom(facets);
    });

/** Which cards a list asks for: the folder, the search, the sort and the filters. Plain data, so a page can hand it to the client for the next batch. */
export type CardFilter = {
    /** False from a caller that will not read the facets (a further batch on scroll): the API skips that pass. */
    facets?: boolean;
    q?: string;
    collectionId?: string;
    favoritesOnly?: boolean;
    wishlist?: boolean;
    sort?: "name" | "price" | "added" | "dex";
    order?: "asc" | "desc";
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
    /** true: copies with a price; false: the ones nothing prices. */
    priced?: boolean;
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
    set,
    rarity,
    fullArt,
    gen,
    type,
    condition,
    finish,
    language,
    number,
    priced,
    duplicates,
    facets: wantFacets,
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
            ? `cards:${JSON.stringify([q, collectionId, favoritesOnly, wishlist, sort, order, set, rarity, fullArt, gen, type, condition, finish, language, number, priced, duplicates, wantFacets])}`
            : null;
    const read = async (token?: string) => {
        const { cards, total, copies, facets, value, unpriced, catalogueUnavailable, counts } = await api("/cards", {
            schema: cardsAnswer,
            token,
            params: {
                q: q?.trim() || undefined,
                owned: !wishlist,
                favorite: favoritesOnly ? true : undefined,
                collection: collectionId,
                sort,
                order,
                set,
                rarity,
                fullArt: fullArt ? 1 : undefined,
                gen,
                type,
                condition,
                finish,
                language,
                number,
                priced,
                duplicates: duplicates ? 1 : undefined,
                // The API skips its facets pass when told nobody will read them.
                facets: wantFacets === false ? 0 : undefined,
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
            catalogueUnavailable: catalogueUnavailable === true,
            facets: facetsFrom(facets),
            counts: counts ?? null,
        };
    };
    // A caller inside the per-user cache (getPokedexCount) hands the token in: the session cannot
    // be read there. Such a read is never the first batch, so it is not cached twice.
    return key && !token ? perUser(key, read) : read(token);
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
export const getStats = () => perUser("stats", async (token) => (await api("/stats", { token, schema: statsAnswer })).stats);

// The dashboard's numbers. "Owned" counts cards (rows), as the page always has.
export async function getCardStats(): Promise<CardStats> {
    const stats = await getStats();
    return { owned: stats.cards, copies: stats.copies, wishlist: stats.wishlist, favorites: stats.favorites, value: stats.value, unpriced: stats.unpriced };
}

/**
 * The whole of a list, for a folder shown as a Pokédex: the slots need every card, not a page.
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
