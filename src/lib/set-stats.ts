import type { SetCard } from "@/lib/api-shapes";

export type SetStats = {
    /** Distinct cards of the set held. */
    owned: number;
    total: number;
    /** What the cards held are worth, one of each: a second copy does not bring the set nearer. */
    value: number;
    /** What the whole set is worth, one of each card that has a price: `value` plus what is missing. */
    setValue: number;
    /** Cards that carry no price, so `setValue` is a floor and not the sum. */
    unpriced: number;
};

/**
 * The numbers over a set's page, read from the cards the page already has: every card carries its
 * price and whether it is held, so none of this asks the API anything. The value is counted the way
 * the progress is, one of each card, so "€38 of €505" reads like "12 of 124".
 */
export function setStats(cards: SetCard[], total: number): SetStats {
    let owned = 0;
    let value = 0;
    let setValue = 0;
    let unpriced = 0;
    for (const card of cards) {
        if (card.owned) owned += 1;
        if (card.price == null) {
            unpriced += 1;
            continue;
        }
        setValue += card.price;
        if (card.owned) value += card.price;
    }
    return { owned, total, value, setValue, unpriced };
}
