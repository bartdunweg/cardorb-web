import type { SetCard } from "@/lib/api-shapes";

export type SetStats = {
    /** Distinct cards of the set held. */
    owned: number;
    total: number;
    /** What the copies held are worth: each owned card's price times the copies of it. */
    value: number;
    /** What the cards not held would cost, one of each, where they have a price. */
    toComplete: number;
    /** Cards not held that carry no price, so `toComplete` is a floor and not the sum. */
    unpriced: number;
    wishlist: number;
};

/**
 * The numbers over a set's page, read from the cards the page already has: every card carries its
 * price, whether it is held and how many copies, so none of this asks the API anything.
 */
export function setStats(cards: SetCard[], total: number): SetStats {
    let owned = 0;
    let value = 0;
    let toComplete = 0;
    let unpriced = 0;
    let wishlist = 0;
    for (const card of cards) {
        if (card.owned) {
            owned += 1;
            value += (card.price ?? 0) * Math.max(card.quantity, 1);
            continue;
        }
        if (card.wishlist) wishlist += 1;
        if (card.price == null) unpriced += 1;
        else toComplete += card.price;
    }
    return { owned, total, value, toComplete, unpriced, wishlist };
}

/** "165 + 42 secret": the number printed on the cards and the ones past it. Null where they agree or one is unknown. */
export function secretLabel(total: number, printedTotal: number | null): string | null {
    if (printedTotal == null || printedTotal <= 0 || total <= printedTotal) return null;
    return `${printedTotal} + ${total - printedTotal} secret`;
}
