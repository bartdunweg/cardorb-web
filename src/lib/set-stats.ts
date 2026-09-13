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

/**
 * The cards past the number printed on them (207 against "165" is 42); null where they agree or one
 * is unknown. A gallery shown inside the set is not among them: Brilliant Stars' 216 are 172
 * printed, 14 secret and 30 Trainer Gallery.
 */
export function secretCount(total: number, printedTotal: number | null, galleryTotal = 0): number | null {
    const own = total - galleryTotal;
    if (printedTotal == null || printedTotal <= 0 || own <= printedTotal) return null;
    return own - printedTotal;
}
