import { formatValue } from "@/lib/format";

/** What a folder page says under its title: how many cards it shows and what they are worth. */
export type Datapoints = {
    total: number;
    /** A search or a filter is on: the count is what matched, not what the folder holds. */
    narrowed: boolean;
    /** Euros, over the cards shown; absent until the API answers it. */
    value?: number | null;
    /** Copies without a price, among those shown. */
    unpriced?: number;
    /** A folder shown as a Pokédex: slots filled, of the range. */
    caught?: { of: number; total: number };
};

const n = (v: number) => v.toLocaleString("en-US");

/** "734 cards · €2,140" · "12 matches" · "0 cards" */
export function datapointsLine(d: Datapoints): string {
    const count = d.narrowed ? `${n(d.total)} match${d.total === 1 ? "" : "es"}` : `${n(d.total)} card${d.total === 1 ? "" : "s"}`;
    const parts = [count];
    if (d.caught) parts.unshift(`${n(d.caught.of)} of ${n(d.caught.total)} Pokémon`);
    if (d.value != null && d.total > 0) parts.push(formatValue(d.value));
    return parts.join(" · ");
}
