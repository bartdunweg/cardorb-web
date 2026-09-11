import { formatPercent, formatPrice } from "@/lib/format";

export type PriceChange = {
    direction: "up" | "down";
    /** The absolute difference, in euros. */
    amount: number;
    /** The absolute difference as a ratio of the average: 0.05 for five percent. */
    ratio: number;
    /** What the line says: "+€0.12 · 5%". The sign is always there, so colour never carries it alone. */
    text: string;
    /** What a screen reader says: "Up €0.12, 5 percent, against the 30-day average". */
    label: string;
};

/**
 * Where a card's Near Mint price sits against its 30-day average, for the line beside the price.
 *
 * Nothing under half a percent or under a cent: a card that moved by less than that has not
 * moved, and a "+€0.00 · 0%" would say it had. Nothing either without both figures, or with an
 * average of zero, which has no percent.
 */
export function priceChange(price: number | null | undefined, avg30: number | null | undefined): PriceChange | null {
    if (price == null || avg30 == null || avg30 <= 0) return null;
    const diff = price - avg30;
    const amount = Math.abs(diff);
    const ratio = amount / avg30;
    if (amount < 0.01 || ratio < 0.005) return null;
    const direction = diff > 0 ? "up" : "down";
    const sign = direction === "up" ? "+" : "−";
    return {
        direction,
        amount,
        ratio,
        text: `${sign}${formatPrice(amount)} · ${formatPercent(ratio)}`,
        label: `${direction === "up" ? "Up" : "Down"} ${formatPrice(amount)}, ${Math.round(ratio * 100)} percent, against the 30-day average`,
    };
}
