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
 * TCGplayer price. The series is the copy's own printing where it is known, so the arrow compares
 * the price above it with the same printing's month: ex8-15's holo at €22.51 read "+648%" against
 * a stray plain series at €3 (pricing audit, 2026-09-14). Null without a single point in the window.
 */
export function average30(points: PriceLinePoint[], today: string, holo: boolean, printing: string | null = null): number | null {
    const from = new Date(`${today}T00:00:00Z`);
    from.setUTCDate(from.getUTCDate() - 30);
    const since = from.toISOString().slice(0, 10);
    const values = points
        .filter((p) => p.date >= since && p.date <= today)
        .map((p) => valueOf(p, printing, holo))
        .filter((v): v is number => v != null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** One day of a card's price line as the API answers it. */
export type PriceLinePoint = { date: string; market: number | null; holo: number | null; printings?: Record<string, number> };

/**
 * One day's figure for one series: the named printing where one is asked for, the foil or the plain
 * line otherwise, and never another series standing in on a day this one has no figure. A reverse
 * copy read the plain price on a day its foil had none, the same mixing cardorb-api#443 took out.
 */
export function valueOf(point: PriceLinePoint, printing: string | null, holo: boolean): number | null {
    if (printing) return point.printings?.[printing] ?? null;
    return (holo ? point.holo : point.market) ?? null;
}

/** TCGplayer's printings in the order a person reads them, with the words the sheet shows. */
const PRINTING_LABELS: [string, string][] = [
    ["normal", "Normal"],
    ["unlimited", "Unlimited"],
    ["holofoil", "Holo"],
    ["unlimited-holofoil", "Unlimited Holo"],
    ["reverse-holofoil", "Reverse Holo"],
    ["1st-edition", "1st Edition"],
    ["1st-edition-holofoil", "1st Edition Holo"],
    ["shadowless", "Shadowless"],
    ["shadowless-holofoil", "Shadowless Holo"],
];

/** The printings a card has readings for, in reading order, each with its label. */
export function printingsOfLine(points: PriceLinePoint[]): { key: string; label: string }[] {
    const seen = new Set(points.flatMap((p) => Object.keys(p.printings ?? {})));
    return PRINTING_LABELS.filter(([key]) => seen.has(key)).map(([key, label]) => ({ key, label }));
}
