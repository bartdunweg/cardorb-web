import { api } from "@/lib/api";
import { type Card, type CardItem, cardFromItem, cardsAnswer, facetsAnswer, statsAnswer } from "@/lib/api-shapes";
import { perUser } from "@/lib/user-cache";

export type { Card, PublicCard } from "@/lib/api-shapes";

/** What a filter menu offers: the sets you hold a card of, in set order, and the rarities, A to Z. */
export type Facets = {
    sets: { name: string; title: string }[];
    rarities: string[];
    /** In the collection's own order, which is the catalogue's series order and so chronological. */
    gens: string[];
    /** A to Z. */
    types: string[];
};

/**
 * The sets and rarities you hold a card of, for a rule's fields and the search's chips. Five
 * minutes per person. The loader takes the token it is handed: inside the cache there is no
 * request to read a session from, and a read that asks for one throws before the API is called.
 */
export const getFacets = (): Promise<Facets> =>
    perUser("facets", async (token) => {
        const { facets } = await api("/cards", { token, params: { owned: true, limit: 1 }, schema: facetsAnswer });
        return { sets: facets?.sets ?? [], rarities: facets?.rarities ?? [], gens: facets?.gens ?? [], types: facets?.types ?? [] };
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
    set?: string;
    rarity?: string;
    /** One generation, whole, as the catalogue names its series. */
    gen?: string;
    /** One energy type, whole, as the catalogue names it. */
    type?: string;
    /** A card number, whole; with `set` it names one card's every row. */
    number?: string;
    /** true: copies with a price; false: the ones nothing prices. */
    priced?: boolean;
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
    gen,
    type,
    number,
    priced,
    facets: wantFacets,
}: CardFilter & { limit?: number; offset?: number } = {}): Promise<{
    cards: Card[];
    total: number;
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
}> {
    // The first batch of a list is the read every list page waits on; per person and five
    // minutes it is a cache read instead of a round trip, and a write drops it with the rest
    // (forgetMine). Further batches and the odd sizes (a count, a whole Pokédex) go straight.
    const key =
        offset === 0 && limit === LIST_BATCH
            ? `cards:${JSON.stringify([q, collectionId, favoritesOnly, wishlist, sort, order, set, rarity, gen, type, number, priced, wantFacets])}`
            : null;
    const read = async (token?: string) => {
        const { cards, total, facets, value, unpriced, catalogueUnavailable } = await api("/cards", {
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
                gen,
                type,
                number,
                priced,
                // The API skips its facets pass when told nobody will read them.
                facets: wantFacets === false ? 0 : undefined,
                limit,
                offset,
            },
        });
        // The API has carried facets since its #161, the same day as this read; an older deploy or a
        // rollback answers without them, and one older than its #226 without gens and types. Empty
        // menus then, not a Cards page that throws on facets.sets.
        return {
            cards: cards.map(cardFromItem),
            total,
            value: value ?? null,
            unpriced: unpriced ?? 0,
            catalogueUnavailable: catalogueUnavailable === true,
            facets: { sets: facets?.sets ?? [], rarities: facets?.rarities ?? [], gens: facets?.gens ?? [], types: facets?.types ?? [] },
        };
    };
    return key ? perUser(key, read) : read();
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
export async function getAllMyCards(filter: CardFilter) {
    const PAGE = 2000;
    const first = await getMyCards({ ...filter, limit: PAGE, offset: 0 });
    const got = first.cards.length;
    if (got >= first.total || got === 0) return first;
    const pages = Math.ceil((first.total - got) / got);
    const rest = await Promise.all(Array.from({ length: pages }, (_, i) => getMyCards({ ...filter, limit: PAGE, offset: got * (i + 1) })));
    return { ...first, cards: [...first.cards, ...rest.flatMap((p) => p.cards)] };
}
