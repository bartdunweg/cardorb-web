import { describe, expect, it, vi } from "vitest";

// Only the wiring is under test: which address is asked and which key the answer is kept under.
const { api, keys } = vi.hoisted(() => ({ api: vi.fn(async () => ({ up: [], down: [] })), keys: [] as string[] }));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/lib/user-cache", () => ({
    perUser: (_scope: string, key: string, run: (token?: string) => unknown) => {
        keys.push(key);
        return run("t.o.k.e.n");
    },
}));

const { getMovers } = await import("@/lib/movers");

describe("getMovers", () => {
    it("asks for the collection without a folder", async () => {
        await getMovers("30");
        expect(api).toHaveBeenLastCalledWith("/movers?days=30", expect.anything());
        expect(keys.at(-1)).toBe("movers:all:30");
    });

    it("asks for a list by its folder, kept apart from the collection's answer", async () => {
        await getMovers("7", "wishlist");
        expect(api).toHaveBeenLastCalledWith("/movers?days=7&folder=wishlist", expect.anything());
        expect(keys.at(-1)).toBe("movers:wishlist:7");

        const binder = "70b334a6-3a53-4ee5-905f-fd13a0d4ed9f";
        await getMovers("all", binder);
        expect(api).toHaveBeenLastCalledWith(`/movers?days=all&folder=${binder}`, expect.anything());
        expect(keys.at(-1)).toBe(`movers:${binder}:all`);
    });
});
