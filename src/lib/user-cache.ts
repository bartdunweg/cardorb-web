import { cache } from "react";
import { revalidatePath, revalidateTag, unstable_cache, updateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { ApiError, CACHE_SECONDS, api, cacheWindow, session } from "@/lib/api";
import { ownProfileSchema } from "@/lib/api-shapes";
import { type CacheScope, type ForgetWrite, forgetTags, readTags, scopesForgotten } from "@/lib/cache-scopes";
import { elapsed, logTiming } from "@/lib/timing";

/**
 * The signed-in person's slow-moving data, kept across requests.
 *
 * The app layout asks the API for the profile, the binders and the stats on every screen, one
 * after the other, and the API sits in another region. Those three answers change when the
 * person writes (adds a card, renames a binder, changes their name) and not otherwise, so
 * they are kept for five minutes per person, each under its scope (`cache-scopes.ts`), and a write
 * drops the scopes it changed: a plus on a tile leaves the profile standing.
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

// The window in the key is what stops the Data Cache answering an entry past its five minutes (api.ts, cacheWindow).

export { userTag } from "@/lib/cache-scopes";

/**
 * In every key since reads were filed by scope. An entry from before carries only the person's tag,
 * so a scoped forget would not reach it, and the Data Cache keeps entries across a deploy (#206).
 */
const KEY_VERSION = "scoped:v2";

/** The name a scope's mark goes by, in the request's reads and in its cache key (`scopeMark`). */
const MARK = "#mark";

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
 * `load` gets the session's token; its answer is kept five minutes under this person's tag and its scope's.
 *
 * Also once per request: the layout and the page render at the same time and both ask for the
 * stats, and on a miss the cache does not join the two; the log showed `/stats` fetched twice in
 * one render. The second caller gets the first caller's promise, so a name is read once per
 * request whatever the cache says.
 */
export function perUser<T>(scope: CacheScope, name: string, load: (token: string) => Promise<T>): Promise<T> {
    const reads = inFlight();
    const key = `${scope}|${name}`;
    const started = reads.get(key);
    if (started) return started as Promise<T>;
    const read = perUserUncached(scope, name, load);
    reads.set(key, read);
    return read;
}

async function perUserUncached<T>(scope: CacheScope, name: string, load: (token: string) => Promise<T>): Promise<T> {
    const s = await session();
    if (!s) throw new ApiError(401, "Sign in to see this.");
    // A miss runs `load` (its API call logs its own line); a hit is one read from the cache.
    let ran = false;
    const start = performance.now();
    try {
        const mark = await scopeMark(s.userId, scope);
        if (!mark.stored) {
            ran = true;
            return await load(s.token);
        }
        return await unstable_cache(
            () => {
                ran = true;
                return load(s.token);
            },
            [name, s.userId, cacheWindow(), KEY_VERSION, mark.id],
            { revalidate: CACHE_SECONDS, tags: readTags(s.userId, scope) },
        )();
    } finally {
        logTiming(`cache ${name}`, elapsed(start), ran ? "miss" : "hit");
    }
}

/**
 * The mark a scope's reads are filed under until a write forgets it, so a read that began before a
 * write can never be handed out after it.
 *
 * Why: the Data Cache stamps an entry with the moment it is stored, and a tag forgotten with
 * `expire: 0` only drops entries stamped before that moment (next's tags-manifest.external.js,
 * `expiredAt > entry.lastModified`). A read that asked the API before a write and was stored after
 * the write's forget was therefore fresh for its five minutes: a set page said one copy 3 s after
 * the second copy's write, 4 rounds in 4 on the widened e2e probe (run 35237287279, 2026-09-17).
 *
 * How: the mark is a random id kept in the Data Cache under the scope's own tags, so every forget
 * of the scope drops it and the next read makes a new one. Its id is in the key of every read in
 * the scope. A read is stored only under a mark it found already stored: that mark was stamped
 * before the read began, so a write forgotten after the read began is also after the stamp, drops
 * the mark, and nobody asks that key again. A request that makes the mark itself reads without
 * storing, because Next stores a miss behind the answer (unstable-cache.js, `pendingRevalidates`)
 * and the mark may not be stamped yet when the read begins.
 *
 * Chosen over a write version from the API (its `cards_version`, api#360), which is as exact but
 * costs a round trip on every request and a version for binders and the profile too. This costs one
 * Data Cache read per scope per request, and after each write (or a mark lost from the cache) one
 * read in each forgotten scope that is not stored, so the second screen after a write asks the API
 * once more. It needs no process memory, so it holds across Vercel's instances as far as the tags
 * themselves do. No window in its key: a mark only ends by a forget, and a new one every five
 * minutes would cost that unstored read every five minutes.
 */
function scopeMark(userId: string, scope: CacheScope): Promise<{ id: string; stored: boolean }> {
    const reads = inFlight();
    const key = `${scope}|${MARK}`;
    const started = reads.get(key);
    if (started) return started as Promise<{ id: string; stored: boolean }>;
    const made = randomUUID();
    const mark = unstable_cache(async () => made, [MARK, userId, scope, KEY_VERSION], { revalidate: false, tags: readTags(userId, scope) })().then((id) => ({
        id,
        stored: id !== made,
    }));
    reads.set(key, mark);
    return mark;
}

/**
 * After a write: the cached answers it changed are gone before the action returns, so the very next
 * render reads fresh. `updateTag` rather than `revalidateTag` because this is read-your-own-write:
 * stale-while-revalidate would hand the writer the screen from before their write.
 *
 * `write` names what was written (`cache-scopes.ts`); `all` forgets everything the person has.
 */
export async function forgetMine(write: ForgetWrite = "all"): Promise<void> {
    const s = await session();
    if (s) {
        // Before the tag goes: dropping it first would make this read a miss and cost a call.
        // The name it returns is the one from before the write, which is exactly the name whose
        // public pages are now stale; a rename leaves nothing cached under the new one.
        const username = await myUsername();
        for (const tag of forgetTags(s.userId, write)) updateTag(tag);
        if (username) updateTag(publicTag(username));
    }
    // The render after this action runs in the same request; it must not get a read from before the write.
    forgetInFlight(write);
    revalidatePath("/dashboard", "layout");
}

/** This request's reads in the scopes a write changed. */
function forgetInFlight(write: ForgetWrite) {
    const reads = inFlight();
    if (write === "all") return reads.clear();
    const gone = scopesForgotten(write);
    for (const key of [...reads.keys()]) if (gone.some((scope) => key.startsWith(`${scope}|`))) reads.delete(key);
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
export async function forgetMineLater(write: ForgetWrite = "all"): Promise<boolean> {
    const s = await session();
    if (!s) return false;
    const username = await myUsername();
    for (const tag of forgetTags(s.userId, write)) revalidateTag(tag, { expire: 0 });
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
        const own = await perUser("profile", "profile", (token) => api("/profile", { token, schema: ownProfileSchema }));
        return own.username || null;
    } catch {
        return null;
    }
}
