import { formatCount, formatValue } from "@/lib/format";

/** What a folder page says under its title: how many cards it shows and what they are worth. */
export type Datapoints = {
    /** Rows in the list: what a page of it walks through. */
    total: number;
    /**
     * The list as a person counts it (an owned copy `quantity` times), which is the number a
     * page says for it. Three screens said three numbers for one binder (rows, distinct cards,
     * copies) and each was right about something else; copies is the one, everywhere, since
     * 2026-09-11. Absent from an API before it, when the rows stand in.
     */
    copies?: number;
    /** A search or a filter is on: the count is what matched, not what the folder holds. */
    narrowed: boolean;
    /** Euros, over the cards shown; absent until the API answers it. */
    value?: number | null;
    /** Copies without a price, among those shown. */
    unpriced?: number;
    /** A folder shown as a Pokédex: slots filled, of the range. */
    caught?: { of: number; total: number };
};

/** "734 cards · €2,140" · "12 matches" · "0 cards" */
export function datapointsLine(d: Datapoints): string {
    return datapointsLines(d).join(" · ");
}

/**
 * The same, as lines: the Pokédex's "544 of 1,025 Pokémon" on one, the count and the value on the
 * next. Two lines always, so the line does not wrap on one phone and not on another, and the
 * outline drawn while the numbers load has the same height as the numbers.
 */
export function datapointsLines(d: Datapoints): string[] {
    const cards = d.copies ?? d.total;
    const count = d.narrowed ? `${formatCount(d.total)} match${d.total === 1 ? "" : "es"}` : `${formatCount(cards)} card${cards === 1 ? "" : "s"}`;
    const parts = [count];
    if (d.value != null && d.total > 0) parts.push(formatValue(d.value));
    const line = parts.join(" · ");
    return d.caught ? [`${formatCount(d.caught.of)} of ${formatCount(d.caught.total)} Pokémon`, line] : [line];
}
