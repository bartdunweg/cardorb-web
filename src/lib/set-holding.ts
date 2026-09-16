import type { SetCard } from "@/lib/api-shapes";

/** What the buttons under a set tile change about a card. */
export type Holding = Pick<SetCard, "owned" | "quantity" | "wishlist" | "itemIds">;

/** One card's holding as a string, to tell whether the page has drawn it differently since. Here and not in set-live.tsx: the server page reads it too. */
export const holdingKey = (h: Holding) => `${h.owned}:${h.quantity}:${h.wishlist}:${h.itemIds.join(",")}`;

/** Every card's holding folded into a short string (FNV-1a), so the page hands the client one word and not a line per card. */
export function holdingStamp(cards: (Holding & { id: string })[]): string {
    let hash = 0x811c9dc5;
    for (const card of cards) {
        const line = `${card.id}=${holdingKey(card)};`;
        for (let i = 0; i < line.length; i++) {
            hash ^= line.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193);
        }
    }
    return (hash >>> 0).toString(36);
}
