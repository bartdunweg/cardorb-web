import type { SetCard } from "@/lib/api-shapes";

export type SetStats = {
    /** Distinct cards of the set held; null where nobody was asked, which is not none held. */
    owned: number | null;
    total: number;
    /** What the cards held are worth, one of each: a second copy does not bring the set nearer. Null where nobody was asked, beside `owned`. */
    value: number | null;
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
    // The answer carries what is held for every card or for none of them, so one card that names a
    // holding says the reader was asked. Without one, the two counts that are about a person are
    // null: a 0 here would read as "you own none of this set, worth nothing".
    const asked = cards.some((card) => card.holding !== null);
    for (const card of cards) {
        if (card.holding?.owned) owned += 1;
        if (card.price == null) {
            unpriced += 1;
            continue;
        }
        setValue += card.price;
        if (card.holding?.owned) value += card.price;
    }
    return { owned: asked ? owned : null, total, value: asked ? value : null, setValue, unpriced };
}
