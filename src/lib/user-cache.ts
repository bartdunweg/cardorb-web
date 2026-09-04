import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { ApiError, session } from "@/lib/api";
import { elapsed, logTiming } from "@/lib/timing";

/**
 * The signed-in person's slow-moving data, kept across requests.
 *
 * The app layout asks the API for the profile, the folders and the stats on every screen, one
 * after the other, and the API sits in another region. Those three answers change when the
 * person writes — adds a card, renames a folder, changes their name — and not otherwise, so
 * they are kept for five minutes under one tag per person, and every write drops the tag.
 *
 * Keyed by the person's id, never by the token: the token rotates every hour and would only
 * fragment the cache. The token is resolved *before* the cached function runs and handed in,
 * because Next refuses `cookies()` inside a cache scope. On a hit nothing runs; on a miss the
 * token is used once, for one read that fills the cache with plain data.
 *
 * The list of cards is deliberately not here: the person who just added a card expects to see
 * it on the next screen, and the API answers that read from its own cache in well under the
 * time a round trip costs.
 */

const FIVE_MINUTES = 300;

export const userTag = (userId: string) => `user:${userId}`;

/** `load` gets the session's token; its answer is kept five minutes under this person's tag. */
export async function perUser<T>(name: string, load: (token: string) => Promise<T>): Promise<T> {
    const s = await session();
    if (!s) throw new ApiError(401, "Sign in to see this.");
    // A miss runs `load` (its API call logs its own line); a hit is one read from the cache.
    let ran = false;
    const start = performance.now();
    try {
        return await unstable_cache(
            () => {
                ran = true;
                return load(s.token);
            },
            [name, s.userId],
            { revalidate: FIVE_MINUTES, tags: [userTag(s.userId)] },
        )();
    } finally {
        logTiming(`cache ${name}`, elapsed(start), ran ? "miss" : "hit");
    }
}

/**
 * After a write: the person's cached answers are gone before the action returns, so the very next
 * render reads fresh. `updateTag` rather than `revalidateTag` because this is read-your-own-write:
 * stale-while-revalidate would hand the writer the screen from before their write.
 */
export async function forgetMine(): Promise<void> {
    const s = await session();
    if (s) updateTag(userTag(s.userId));
    revalidatePath("/dashboard", "layout");
}
