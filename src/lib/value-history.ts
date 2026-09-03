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
// numbers; a new reading arrives once a night, so the cache never hides one for long.
export async function getValueHistory(): Promise<ValueSnapshot[]> {
    const { snapshots } = await perUser("value-history", (token) => api<{ snapshots: ValueSnapshot[] }>("/value-history", { token }));
    return snapshots;
}
