import { api } from "@/lib/api";
import { type Card, type CardItem, cardFromItem } from "@/lib/api-shapes";
import { perUser } from "@/lib/user-cache";

export type { Card, PublicCard } from "@/lib/api-shapes";

/** What a filter menu offers: the sets you hold a card of, in set order, and the rarities, A to Z. */
export type Facets = { sets: { name: string; title: string }[]; rarities: string[] };

/** The sets and rarities you hold a card of, for a rule's fields. Five minutes per person. */
export const getFacets = (): Promise<Facets> => perUser("facets", async () => (await getMyCards({ limit: 1 })).facets);

/** Which cards a list asks for: the folder, the search, the sort and the two filters. Plain data, so a page can hand it to the client for the next batch. */
export type CardFilter = {
    q?: string;
    collectionId?: string;
    favoritesOnly?: boolean;
    wishlist?: boolean;
    sort?: "name" | "price" | "added" | "dex";
    order?: "asc" | "desc";
    set?: string;
    rarity?: string;
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
}: CardFilter & { limit?: number; offset?: number } = {}): Promise<{
    cards: Card[];
    total: number;
    /** What the whole filtered list is worth, in euros; null from an API that does not answer it yet. */
    value: number | null;
    /** Copies in the filtered list without a price. */
    unpriced: number;
    /** The sets and rarities held, over the whole collection whatever the filters: what the two menus offer. */
    facets: Facets;
}> {
    const { cards, total, facets, value, unpriced } = await api<{ cards: CardItem[]; total: number; facets?: Facets; value?: number; unpriced?: number }>(
        "/cards",
        {
            params: {
                q: q?.trim() || undefined,
                owned: !wishlist,
                favorite: favoritesOnly ? true : undefined,
                collection: collectionId,
                sort,
                order,
                set,
                rarity,
                limit,
                offset,
            },
        },
    );
    // The API has carried facets since its #161, the same day as this read; an older deploy or a
    // rollback answers without them. Empty menus then, not a Cards page that throws on facets.sets.
    return { cards: cards.map(cardFromItem), total, value: value ?? null, unpriced: unpriced ?? 0, facets: facets ?? { sets: [], rarities: [] } };
}

export type CardStats = {
    owned: number;
    wishlist: number;
    favorites: number;
    /** Today's value of every copy held, in euros. A whole-collection figure the API adds up (R-DATA-006 there). */
    value: number;
    /** Copies held that carry no price and add nothing to `value`. */
    unpriced: number;
};

export type ApiStats = { cards: number; copies: number; wishlist: number; favorites: number; sets: number; value: number; unpriced: number };

// Kept five minutes per person: the layout and a page both ask, and every write drops the cache.
export const getStats = () => perUser("stats", async (token) => (await api<{ stats: ApiStats }>("/stats", { token })).stats);

// The dashboard's numbers. "Owned" counts cards (rows), as the page always has.
export async function getCardStats(): Promise<CardStats> {
    const stats = await getStats();
    return { owned: stats.cards, wishlist: stats.wishlist, favorites: stats.favorites, value: stats.value, unpriced: stats.unpriced };
}

/**
 * The whole of a list, for a folder shown as a Pokédex: the slots need every card, not a page.
 * The API caps a page at 500; the first page says how many there are, the rest come in parallel.
 */
export async function getAllMyCards(filter: CardFilter) {
    const PAGE = 500;
    const first = await getMyCards({ ...filter, limit: PAGE, offset: 0 });
    const pages = Math.ceil(first.total / PAGE);
    const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => getMyCards({ ...filter, limit: PAGE, offset: (i + 1) * PAGE })));
    return { ...first, cards: [...first.cards, ...rest.flatMap((p) => p.cards)] };
}
