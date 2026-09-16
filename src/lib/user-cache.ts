import { cache } from "react";
import { revalidatePath, revalidateTag, unstable_cache, updateTag } from "next/cache";
import { ApiError, api, session } from "@/lib/api";
import { ownProfileSchema } from "@/lib/api-shapes";
import { elapsed, logTiming } from "@/lib/timing";

/**
 * The signed-in person's slow-moving data, kept across requests.
 *
 * The app layout asks the API for the profile, the folders and the stats on every screen, one
 * after the other, and the API sits in another region. Those three answers change when the
 * person writes (adds a card, renames a folder, changes their name) and not otherwise, so
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

/**
 * Which five minutes it is, as a key part.
 *
 * The Data Cache does not stop at `revalidate`: an entry past its five minutes is answered as it
 * stands and refreshed behind the reader. So the first open after a quiet spell (every morning,
 * for a person who looks once a day) showed the numbers from before the night's prices, and a
 * refresh showed today's; the lists read the same way (2026-09-16). An entry keyed by its window
 * is never asked for once the window is over: the next read is a miss, and a miss is the call.
 * The TTL stays as the entry's own life, so a window's entry is gone rather than kept for ever.
 */
const fiveMinuteWindow = () => String(Math.floor(Date.now() / (FIVE_MINUTES * 1000)));

export const userTag = (userId: string) => `user:${userId}`;

/**
 * What the public pages of one person are filed under. Those are read without a session, so they
 * live in the Data Cache for five minutes (`api()` with `auth: false`) rather than under
 * `userTag`, and nothing dropped them: a profile switched to private, or a copy hidden from it,
 * stayed readable to a visitor for the rest of the window.
 *
 * By username, not by id. The read has only the name: a visitor has no session to turn into an
 * id, and asking the API who owns the name would cost the very round trip the cache exists to
 * save. So the translating happens on the writing side, where a name is one cached read away
 * (`forgetMine`). Lower-cased because the API stores names lower-cased while a link may not.
 */
export const publicTag = (username: string) => `public:${username.toLowerCase()}`;

/** The reads in flight for this request, by name. React's `cache` keeps one map per request. */
const inFlight = cache(() => new Map<string, Promise<unknown>>());

/**
 * `load` gets the session's token; its answer is kept five minutes under this person's tag.
 *
 * Also once per request: the layout and the page render at the same time and both ask for the
 * stats, and on a miss the cache does not join the two; the log showed `/stats` fetched twice in
 * one render. The second caller gets the first caller's promise, so a name is read once per
 * request whatever the cache says.
 */
export function perUser<T>(name: string, load: (token: string) => Promise<T>): Promise<T> {
    const reads = inFlight();
    const started = reads.get(name);
    if (started) return started as Promise<T>;
    const read = perUserUncached(name, load);
    reads.set(name, read);
    return read;
}

async function perUserUncached<T>(name: string, load: (token: string) => Promise<T>): Promise<T> {
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
            [name, s.userId, fiveMinuteWindow()],
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
    if (s) {
        // Before the tag goes: dropping it first would make this read a miss and cost a call.
        // The name it returns is the one from before the write, which is exactly the name whose
        // public pages are now stale; a rename leaves nothing cached under the new one.
        const username = await myUsername();
        updateTag(userTag(s.userId));
        if (username) updateTag(publicTag(username));
    }
    // The render after this action runs in the same request; it must not get a read from before the write.
    inFlight().clear();
    revalidatePath("/dashboard", "layout");
}

/**
 * After a write the screen already shows: the cached answers go, and nothing is drawn again now.
 *
 * For a list you are stepping copies on, through `/api/forget-mine`: forgetMine() in an action
 * redraws the page in the action's answer, and so does any tag dropped in an action, and a redrawn
 * list starts again from its first batch. False when there is no session to forget for.
 *
 * Expired at once, not "max": under "max" the next read was handed the answer from before the
 * press while a fresh one was fetched behind it, so the sidebar read after a plus still said the
 * old count and caught up one press late (measured 2026-09-13).
 */
export async function forgetMineLater(): Promise<boolean> {
    const s = await session();
    if (!s) return false;
    const username = await myUsername();
    revalidateTag(userTag(s.userId), { expire: 0 });
    if (username) revalidateTag(publicTag(username), { expire: 0 });
    return true;
}

/**
 * The writer's own username, for `publicTag`.
 *
 * Through the same cache entry `getMyProfile()` fills (same name, same schema, so the two share
 * one value rather than making a second), which the layout filled on the render before this
 * write, so it is a cache read and not a call. Best effort: a name that cannot be read only means
 * the public pages keep their five minutes, and a write that succeeded must not fail over it.
 */
async function myUsername(): Promise<string | null> {
    try {
        const own = await perUser("profile", (token) => api("/profile", { token, schema: ownProfileSchema }));
        return own.username || null;
    } catch {
        return null;
    }
}
