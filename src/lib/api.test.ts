import { afterEach, describe, expect, it, vi } from "vitest";

/** Who the session says is asking, per test. Null is a visitor with no account. */
let signedIn: { userId: string; token: string } | null = null;
vi.mock("@/lib/supabase/server", () => ({
    createClient: async () => ({
        auth: {
            getClaims: async () => (signedIn ? { data: { claims: { sub: signedIn.userId } } } : { data: null }),
            getSession: async () => ({ data: { session: signedIn ? { access_token: signedIn.token } : null } }),
        },
    }),
}));
vi.mock("@/lib/timing", () => ({ timed: (_name: string, fn: () => unknown) => fn() }));

const { api } = await import("@/lib/api");

/** What `fetch` was asked, per call. */
const asked: RequestInit[] = [];
vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
        asked.push(init);
        return { ok: true, json: async () => ({}) } as Response;
    }),
);
const windowOf = (init: RequestInit) => (init.headers as Record<string, string>)["x-cache-window"];
const tokenOf = (init: RequestInit) => (init.headers as Record<string, string>).authorization;

describe("api, a read without a session", () => {
    afterEach(() => {
        asked.length = 0;
        vi.useRealTimers();
    });

    it("names the five-minute window it is read in, so a visitor is never handed the entry past it", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-16T04:00:00Z"));
        await api("/public/bart/profile", { auth: false });
        vi.setSystemTime(new Date("2026-09-16T04:04:59Z"));
        await api("/public/bart/profile", { auth: false });
        vi.setSystemTime(new Date("2026-09-16T04:05:00Z"));
        await api("/public/bart/profile", { auth: false });
        const [within, stillWithin, next] = asked.map(windowOf);
        // The fetch cache answers an entry past `revalidate` as it stands and refreshes it behind
        // the reader; the window in the key is what stops that (user-cache.ts says the rest).
        expect(within).toBeTruthy();
        expect(stillWithin).toBe(within);
        expect(next).not.toBe(within);
        expect(asked[0]?.next).toMatchObject({ revalidate: 300 });
    });
});

/**
 * The catalogue answers both kinds of reader since it opened, so one call site has to be able to
 * ask either way: with the token when the session has one, and anyway when it has not.
 */
describe("api, a read that may or may not name the reader", () => {
    afterEach(() => {
        asked.length = 0;
        signedIn = null;
    });

    it("names the reader when there is one", async () => {
        signedIn = { userId: "me", token: "a-token" };
        await api("/catalog/sets", { auth: "optional" });
        expect(tokenOf(asked[0]!)).toBe("Bearer a-token");
    });

    it("asks anyway when there is nobody, rather than refusing before it calls", async () => {
        signedIn = null;
        await expect(api("/catalog/sets", { auth: "optional" })).resolves.toBeDefined();
        expect(tokenOf(asked[0]!)).toBeUndefined();
        expect(asked).toHaveLength(1);
    });

    it("lets a shared cache hold the answer it asked for without a token", async () => {
        signedIn = null;
        await api("/catalog/sets", { auth: "optional" });
        // The window in the key, as every unkeyed read carries (see the test above).
        expect(windowOf(asked[0]!)).toBeTruthy();
        expect(asked[0]?.next).toMatchObject({ revalidate: 300 });
    });

    it("stores nothing shared once it has named the reader", async () => {
        signedIn = { userId: "me", token: "a-token" };
        await api("/catalog/sets", { auth: "optional" });
        expect(asked[0]?.cache).toBe("no-store");
        expect(windowOf(asked[0]!)).toBeUndefined();
    });

    it("still refuses before calling for a route that needs somebody", async () => {
        signedIn = null;
        await expect(api("/stats")).rejects.toMatchObject({ status: 401 });
        expect(asked).toHaveLength(0);
    });
});
