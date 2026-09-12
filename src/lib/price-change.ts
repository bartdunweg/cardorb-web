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
 * Where a card's price sits against its 30-day average, for the line beside the price.
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

/**
 * The card's own average over the thirty days up to `today`, out of its price history.
 *
 * The history, not a catalogue's figure: the line and the price are both TCGplayer's since
 * cardorb-api#355, and the average this arrow used to read was Cardmarket's month, set against a
 * TCGplayer price. A reverse copy reads the foil series, and the plain one on a day the foil has
 * no point. Null without a single point in the window.
 */
export function average30(points: { date: string; market: number | null; holo: number | null }[], today: string, holo: boolean): number | null {
    const from = new Date(`${today}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - 30);
    const since = from.toISOString().slice(0, 10);
    const values = points
        .filter((p) => p.date >= since && p.date <= today)
        .map((p) => (holo ? (p.holo ?? p.market) : p.market))
        .filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
