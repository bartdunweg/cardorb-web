import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * A read that began before a write is never handed out after it (web, 2026-09-17).
 *
 * The Data Cache here keeps Next's own rules, because the bug lived in them: an entry is stamped
 * when it is stored, which for a miss is behind the answer (unstable-cache.js, `pendingRevalidates`),
 * and a tag forgotten with `expire: 0` drops only entries stamped before the forget
 * (tags-manifest.external.js, `expiredAt <= now && expiredAt > lastModified`). The clock only moves
 * when a test says so, and a store lands only when a test says so.
 */

// React's `cache` only memoises inside a render; here one memo stands in for one request.
const memo = new Map<unknown, unknown>();
vi.mock("react", async (original) => ({
    ...(await original<typeof import("react")>()),
    cache: (fn: () => unknown) => () => {
        if (!memo.has(fn)) memo.set(fn, fn());
        return memo.get(fn);
    },
}));

const dataCache = vi.hoisted(() => {
    const state = {
        clock: 1,
        entries: new Map<string, { value: unknown; stamped: number; tags: string[] }>(),
        expired: new Map<string, number>(),
        landing: [] as (() => void)[],
    };
    const isExpired = (tags: string[], stamped: number) =>
        tags.some((tag) => {
            const at = state.expired.get(tag);
            return at !== undefined && at <= state.clock && at > stamped;
        });
    return {
        state,
        unstable_cache: (fn: () => Promise<unknown>, keys: string[], options: { tags: string[] }) => async (): Promise<unknown> => {
            const key = JSON.stringify(keys);
            const hit = state.entries.get(key);
            if (hit && !isExpired(hit.tags, hit.stamped)) return hit.value;
            const value = await fn();
            state.landing.push(() => state.entries.set(key, { value, stamped: state.clock, tags: options.tags }));
            return value;
        },
        revalidateTag: (tag: string) => state.expired.set(tag, state.clock),
        /** Every store still behind its answer lands now. */
        land: () => {
            for (const store of state.landing.splice(0)) store();
        },
    };
});
vi.mock("next/cache", () => ({
    unstable_cache: dataCache.unstable_cache,
    revalidateTag: dataCache.revalidateTag,
    updateTag: dataCache.revalidateTag,
    revalidatePath: vi.fn(),
}));
vi.mock("@/lib/api", async (original) => ({
    ...(await original<typeof import("@/lib/api")>()),
    ApiError: class extends Error {},
    api: async () => ({ username: "bart" }),
    session: async () => ({ userId: "u1", token: "t" }),
}));

const { forgetMineLater, perUser } = await import("@/lib/user-cache");

/** A read whose API answer comes when the test hands it one. */
function slowRead() {
    let answer: (value: string) => void = () => {};
    const load = vi.fn(() => new Promise<string>((resolve) => (answer = resolve)));
    return { load, answer: (value: string) => answer(value) };
}

const newRequest = () => memo.clear();
const tick = () => (dataCache.state.clock += 1);

/** A second request after the write, reading the set page. */
async function readAfterWrite() {
    newRequest();
    tick();
    return perUser("sets", "set:v1:en:sv1", async () => "two copies");
}

describe("a read that began before a write", () => {
    beforeEach(() => {
        newRequest();
        dataCache.state.clock = 1;
        dataCache.state.entries.clear();
        dataCache.state.expired.clear();
        dataCache.state.landing.length = 0;
    });

    it("is not handed out after the write when it is stored after the write's forget", async () => {
        // Browse was read before, so the scope's mark is stored.
        await perUser("sets", "shelf", async () => "shelf");
        dataCache.land();
        tick();

        // The set page reads before the second copy is written; the API answers the old count.
        newRequest();
        const early = slowRead();
        const reading = perUser("sets", "set:v1:en:sv1", early.load);
        await vi.waitFor(() => expect(early.load).toHaveBeenCalled());
        tick();

        // The write lands and forgets, then the early read's answer arrives and is stored.
        newRequest();
        await forgetMineLater("cards");
        tick();
        early.answer("one copy");
        expect(await reading).toBe("one copy");
        dataCache.land();

        expect(await readAfterWrite()).toBe("two copies");
    });

    it("is not handed out when the read made the scope's mark and the mark was stored after the forget", async () => {
        const early = slowRead();
        const reading = perUser("sets", "set:v1:en:sv1", early.load);
        await vi.waitFor(() => expect(early.load).toHaveBeenCalled());
        tick();

        newRequest();
        await forgetMineLater("cards");
        tick();
        dataCache.land();
        early.answer("one copy");
        expect(await reading).toBe("one copy");
        dataCache.land();

        expect(await readAfterWrite()).toBe("two copies");
    });
});

describe("the five minutes otherwise", () => {
    beforeEach(() => {
        newRequest();
        dataCache.state.clock = 1;
        dataCache.state.entries.clear();
        dataCache.state.expired.clear();
        dataCache.state.landing.length = 0;
    });

    const readStats = (load: () => Promise<number>) => {
        newRequest();
        tick();
        const read = perUser("stats", "stats", load);
        return read.finally(() => dataCache.land());
    };

    it("asks the API twice in all while nothing is written", async () => {
        const load = vi.fn(async () => 1);
        await readStats(load);
        await readStats(load);
        await readStats(load);
        // The first read makes the mark and is not stored; the second is stored; the third is a hit.
        expect(load).toHaveBeenCalledTimes(2);
    });

    it("reads the writer's own write on the next screen, and keeps it after that", async () => {
        const load = vi.fn(async () => 1);
        await readStats(load);
        await readStats(load);
        newRequest();
        await forgetMineLater("cards");
        load.mockImplementation(async () => 2);
        expect(await readStats(load)).toBe(2);
        expect(await readStats(load)).toBe(2);
        const calls = load.mock.calls.length;
        expect(await readStats(load)).toBe(2);
        expect(load).toHaveBeenCalledTimes(calls);
    });

    it("keeps a scope the write did not change", async () => {
        const profile = vi.fn(async () => ({ username: "bart" }));
        const read = () => {
            newRequest();
            tick();
            return perUser("profile", "profile", profile).finally(() => dataCache.land());
        };
        await read();
        await read();
        newRequest();
        await forgetMineLater("cards");
        const calls = profile.mock.calls.length;
        await read();
        expect(profile).toHaveBeenCalledTimes(calls);
    });
});
