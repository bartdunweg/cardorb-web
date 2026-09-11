import type { Card, PokemonCard } from "@/lib/api-shapes";

/**
 * The line under a search hit's name: where it is from, and whether you have it.
 *
 * The Add dialog has said "In your collection" under a held card since #250, because adding a
 * second copy on purpose is a different act from adding one you thought you did not have. The
 * palette's hits said nothing, and a card taken from a hit's sheet looked, in the list under it,
 * like one you still did not have.
 */
export function searchHitDescription(c: Pick<PokemonCard, "set" | "number" | "rarity" | "owned" | "wishlist" | "quantity">): string {
    const held = c.owned ? `In your collection${c.quantity > 1 ? ` · ${c.quantity} copies` : ""}` : c.wishlist ? "On your wishlist" : null;
    return [c.set, c.number ? `#${c.number}` : null, c.rarity, held].filter(Boolean).join(" · ");
}

/** The hit as it reads once its card was taken: held, or wished for, by the sheet's word. */
export function takenHit<T extends Pick<PokemonCard, "id" | "owned" | "wishlist" | "quantity">>(hits: T[], id: string, list: "collection" | "wishlist"): T[] {
    return hits.map((h) =>
        h.id !== id ? h : list === "collection" ? { ...h, owned: true, wishlist: false, quantity: h.quantity + 1 } : { ...h, owned: false, wishlist: true },
    );
}

/**
 * The hit as its rows say it is, after a sheet on a held card closes: the sheet may have removed
 * the card, or a copy of it, or turned a wish into a copy, and the hits are read by nobody else.
 * The API's own rule (markOwnership): held where any row is owned, wished where none is and one
 * is a wish, and the count is the owned copies.
 */
export function hitFromRows<T extends Pick<PokemonCard, "owned" | "wishlist" | "quantity">>(hit: T, rows: Pick<Card, "owned" | "wishlist" | "quantity">[]): T {
    const owned = rows.some((r) => r.owned);
    return {
        ...hit,
        owned,
        wishlist: !owned && rows.some((r) => r.wishlist),
        quantity: rows.filter((r) => r.owned).reduce((n, r) => n + (r.quantity ?? 1), 0),
    };
}
