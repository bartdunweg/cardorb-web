import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
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
