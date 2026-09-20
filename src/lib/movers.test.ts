import { describe, expect, it, vi } from "vitest";

// Only the wiring is under test: which address is asked, and under which scope and key the answer
// is kept. The scope is read too: the movers belong to the value line, and filed under another one
// a price write would leave them standing while a card write dropped them for nothing.
const { api, filed } = vi.hoisted(() => ({
    api: vi.fn(async () => ({ up: [], down: [] })),
    filed: [] as { scope: unknown; key: string }[],
}));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/lib/user-cache", () => ({
    perUser: (scope: unknown, key: string, run: (token?: string) => unknown) => {
        filed.push({ scope, key });
        return run("t.o.k.e.n");
    },
}));

const { getMovers } = await import("@/lib/movers");

const last = () => {
    const read = filed.at(-1);
    if (!read) throw new Error("getMovers filed nothing");
    return read;
};

describe("getMovers", () => {
    it("asks for the collection without a folder", async () => {
        await getMovers("30");
        expect(api).toHaveBeenLastCalledWith("/movers?days=30", expect.anything());
        expect(last().key).toBe("movers:all:30");
    });

    it("asks for a list by its folder, kept apart from the collection's answer", async () => {
        await getMovers("7", "wishlist");
        expect(api).toHaveBeenLastCalledWith("/movers?days=7&folder=wishlist", expect.anything());
        expect(last().key).toBe("movers:wishlist:7");

        const binder = "70b334a6-3a53-4ee5-905f-fd13a0d4ed9f";
        await getMovers("all", binder);
        expect(api).toHaveBeenLastCalledWith(`/movers?days=all&folder=${binder}`, expect.anything());
        expect(last().key).toBe(`movers:${binder}:all`);
    });

    /*
     * The scope, not only the key. The mock used to throw the scope away, so moving the movers to
     * any other one (or to none) left every assertion above green while a card write stopped
     * reaching them. `value` is the line's own scope in cache-scopes.ts, and a card write drops it.
     */
    it("files every answer under the value scope, the line's own", async () => {
        await getMovers("30");
        expect(last().scope).toBe("value");
        await getMovers("7", "favorites");
        expect(last().scope).toBe("value");
        await getMovers("all", "70b334a6-3a53-4ee5-905f-fd13a0d4ed9f");
        expect(last().scope).toBe("value");
    });
});
