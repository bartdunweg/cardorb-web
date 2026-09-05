import { formatPrice } from "@/lib/format";

/** What a folder page says under its title: how many cards it shows and what they are worth. */
export type Datapoints = {
    total: number;
    /** A search or a filter is on: the count is what matched, not what the folder holds. */
    narrowed: boolean;
    /** Euros, over the cards shown; absent until the API answers it. */
    value?: number | null;
    /** Copies without a price, among those shown. */
    unpriced?: number;
};

const n = (v: number) => v.toLocaleString("en-US");

/** "734 cards · €2,140" · "12 matches" · "0 cards" */
export function datapointsLine(d: Datapoints): string {
    const count = d.narrowed ? `${n(d.total)} match${d.total === 1 ? "" : "es"}` : `${n(d.total)} card${d.total === 1 ? "" : "s"}`;
    return d.value != null && d.total > 0 ? `${count} · ${formatPrice(d.value)}` : count;
}

/** "12 without a price", or nothing when every copy has one. */
export function unpricedLine(d: Datapoints): string | null {
    return d.unpriced && d.unpriced > 0 ? `${n(d.unpriced)} without a price` : null;
}
