import { api } from "@/lib/api";
import { valueHistoryAnswer } from "@/lib/api-shapes";
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
    /**
     * Copies added since the reading before, and what they were worth that night. What the line
     * gained by holding more rather than by prices moving; absent on a folder's line, read as zero.
     */
    added?: number;
    addedValue?: number;
    /**
     * The Sunday its week began, where the chart shows one reading a week (Max): `date` is then the
     * week's Saturday, or its last reading in the week still running, and the tooltip names the week.
     */
    weekFrom?: string;
};

// Oldest first, as the API sends it. Kept five minutes per person like the other whole-collection
// numbers; a new reading arrives once a night, so the cache never hides one for long. `folder`
// (an id, or "favorites") asks for that list's line instead: built from the daily card prices, so
// it starts where those do, a few weeks back, rather than with the first nightly reading.
export async function getValueHistory(folder?: string): Promise<ValueSnapshot[]> {
    const path = folder ? `/value-history?folder=${encodeURIComponent(folder)}` : "/value-history";
    const { snapshots } = await perUser("value", `value-history:${folder ?? "all"}`, (token) => api(path, { token, schema: valueHistoryAnswer }));
    return snapshots;
}
