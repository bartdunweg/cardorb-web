import { api } from "@/lib/api";
import { type Card, type CardItem, cardFromItem } from "@/lib/api-shapes";
import { perUser } from "@/lib/user-cache";

export type { Card, PublicCard } from "@/lib/api-shapes";

/** What a filter menu offers: the sets you hold a card of, in set order, and the rarities, A to Z. */
export type Facets = { sets: { name: string; title: string }[]; rarities: string[] };

// One page of the signed-in person's cards, from the API (R-DATA-003). `wishlist` picks the
// wishlist (`owned=false`) over the collection; the API sorts by set, then number.
export async function getMyCards({
    limit = 100,
    offset = 0,
    q,
    collectionId,
    favoritesOnly,
    wishlist = false,
    sort,
    order,
    set,
    rarity,
}: {
    limit?: number;
    offset?: number;
    q?: string;
    collectionId?: string;
    favoritesOnly?: boolean;
    wishlist?: boolean;
    sort?: "name" | "price" | "added";
    order?: "asc" | "desc";
    set?: string;
    rarity?: string;
} = {}): Promise<{
    cards: Card[];
    total: number;
    /** The sets and rarities held, over the whole collection whatever the filters: what the two menus offer. */
    facets: Facets;
}> {
    const { cards, total, facets } = await api<{ cards: CardItem[]; total: number; facets: Facets }>("/cards", {
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
    });
    return { cards: cards.map(cardFromItem), total, facets };
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
