import { api } from "@/lib/api";
import { perUser } from "@/lib/user-cache";

/** One nightly reading of what the collection was worth (GET /v1/value-history). */
export type ValueSnapshot = {
    /** ISO date, the night the reading was taken. */
    date: string;
    /** Whole euros. */
    value: number;
    /** Copies held that night. */
    cards: number;
    priced: number;
    unpriced: number;
};

// Oldest first, as the API sends it. Kept five minutes per person like the other whole-collection
// numbers; a new reading arrives once a night, so the cache never hides one for long. `folder`
// (an id, or "favorites") asks for that list's line instead: built from the daily card prices, so
// it starts where those do, a few weeks back, rather than with the first nightly reading.
export async function getValueHistory(folder?: string): Promise<ValueSnapshot[]> {
    const path = folder ? `/value-history?folder=${encodeURIComponent(folder)}` : "/value-history";
    const { snapshots } = await perUser(`value-history:${folder ?? "all"}`, (token) => api<{ snapshots: ValueSnapshot[] }>(path, { token }));
    return snapshots;
}
