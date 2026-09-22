import type { Card, PokemonCard } from "@/lib/api-shapes";
import type { CardHolding } from "@/lib/set-holding";

/**
 * The line under a search hit's name: where it is from, and whether you have it.
 *
 * The Add dialog has said "In your collection" under a held card since #250, because adding a
 * second copy on purpose is a different act from adding one you thought you did not have. The
 * palette's hits said nothing, and a card taken from a hit's sheet looked, in the list under it,
 * like one you still did not have.
 */
export function searchHitDescription(c: Pick<PokemonCard, "set" | "number" | "rarity" | "holding">): string {
    // A hit nobody was asked about says where the card is from and stops there. "Not in your
    // collection" is the reading of a missing "In your collection", and it is not ours to say.
    const h = c.holding;
    const held = h === null ? null : h.owned ? `In your collection${h.quantity > 1 ? ` · ${h.quantity} copies` : ""}` : h.wishlist ? "On your wishlist" : null;
    return [c.set, c.number ? `#${c.number}` : null, c.rarity, held].filter(Boolean).join(" · ");
}

/** The hit as it reads once its card was taken: held, or wished for, by the sheet's word. */
export function takenHit<T extends Pick<PokemonCard, "id" | "holding">>(hits: T[], id: string, list: "collection" | "wishlist"): T[] {
    // A card was taken, so there is a person and an answer about them: a hit that carried none now
    // carries the one this write just made.
    const empty: CardHolding = { owned: false, wishlist: false, quantity: 0 };
    return hits.map((hit) => {
        if (hit.id !== id) return hit;
        const h = hit.holding ?? empty;
        return {
            ...hit,
            holding:
                list === "collection" ? { owned: true, wishlist: false, quantity: h.quantity + 1 } : { owned: false, wishlist: true, quantity: h.quantity },
        };
    });
}

/**
 * The hit as its rows say it is, after a sheet on a held card closes: the sheet may have removed
 * the card, or a copy of it, or turned a wish into a copy, and the hits are read by nobody else.
 * The API's own rule (markOwnership): held where any row is owned, wished where none is and one
 * is a wish, and the count is the owned copies.
 */
export function hitFromRows<T extends Pick<PokemonCard, "holding">>(hit: T, rows: Pick<Card, "owned" | "wishlist" | "quantity">[]): T {
    const owned = rows.some((r) => r.owned);
    // The rows came from a sheet opened by somebody with an account, so this hit is answered about
    // from here on, whether or not it was before.
    return {
        ...hit,
        holding: {
            owned,
            wishlist: !owned && rows.some((r) => r.wishlist),
            quantity: rows.filter((r) => r.owned).reduce((n, r) => n + (r.quantity ?? 1), 0),
        },
    };
}
