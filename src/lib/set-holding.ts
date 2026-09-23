/**
 * What the buttons under a set tile change about a card: one person's copies of one printing.
 *
 * It is defined here rather than picked off `SetCard`, because `SetCard` now carries it as one
 * nullable field and a `Pick` of a nullable object says nothing useful. A card whose holding is
 * null was never asked about; see `SetCard.holding`.
 */
export type Holding = { owned: boolean; quantity: number; wishlist: boolean; itemIds: string[] };

/** The same answer without the rows behind it, which a search hit does not carry (`PokemonCard.holding`). */
export type CardHolding = Omit<Holding, "itemIds">;

/**
 * One card's holding as a string, to tell whether the page has drawn it differently since. Here and
 * not in set-live.tsx: the server page reads it too.
 *
 * A card nobody was asked about has its own word, so it can never key the same as a card read and
 * found empty.
 */
export const holdingKey = (h: Holding | null) => (h === null ? "unasked" : `${h.owned}:${h.quantity}:${h.wishlist}:${h.itemIds.join(",")}`);

/** Every card's holding folded into a short string (FNV-1a), so the page hands the client one word and not a line per card. */
export function holdingStamp(cards: { id: string; holding: Holding | null }[]): string {
    let hash = 0x811c9dc5;
    for (const card of cards) {
        const line = `${card.id}=${holdingKey(card.holding)};`;
        for (let i = 0; i < line.length; i++) {
            hash ^= line.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193);
        }
    }
    return (hash >>> 0).toString(36);
}
