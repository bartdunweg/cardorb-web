import { cache } from "react";
import { api } from "@/lib/api";
import { type Card, type CardItem, cardFromItem } from "@/lib/api-shapes";

export type { Card, PublicCard } from "@/lib/api-shapes";

// One page of the signed-in person's cards, from the API (R-DATA-003). `wishlist` picks the
// wishlist (`owned=false`) over the collection; the API sorts by set, then number.
export async function getMyCards({
    limit = 100,
    offset = 0,
    q,
    collectionId,
    favoritesOnly,
    wishlist = false,
}: { limit?: number; offset?: number; q?: string; collectionId?: string; favoritesOnly?: boolean; wishlist?: boolean } = {}): Promise<{
    cards: Card[];
    total: number;
}> {
    const { cards, total } = await api<{ cards: CardItem[]; total: number }>("/cards", {
        params: {
            q: q?.trim() || undefined,
            owned: !wishlist,
            favorite: favoritesOnly ? true : undefined,
            collection: collectionId,
            limit,
            offset,
        },
    });
    return { cards: cards.map(cardFromItem), total };
}

export type CardStats = { owned: number; wishlist: number; favorites: number };

export type ApiStats = { cards: number; copies: number; wishlist: number; favorites: number; sets: number };

// Once per request: the layout and a page may both ask.
export const getStats = cache(async () => (await api<{ stats: ApiStats }>("/stats")).stats);

// The dashboard's numbers. "Owned" counts cards (rows), as the page always has.
export async function getCardStats(): Promise<CardStats> {
    const stats = await getStats();
    return { owned: stats.cards, wishlist: stats.wishlist, favorites: stats.favorites };
}
