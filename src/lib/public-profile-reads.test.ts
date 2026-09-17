import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPublicListQuery } from "@/lib/list-query";

// React's `cache` memoizes only inside a server request; here it is one request that never ends,
// keyed by the function and its arguments as React keys it.
const { requestMemo } = vi.hoisted(() => ({ requestMemo: new Map<unknown, Map<string, unknown>>() }));
vi.mock("react", async (original) => ({
    ...(await original<typeof import("react")>()),
    cache:
        <A extends unknown[], R>(fn: (...args: A) => R) =>
        (...args: A): R => {
            const perFn = requestMemo.get(fn) ?? new Map<string, unknown>();
            requestMemo.set(fn, perFn);
            const key = JSON.stringify(args);
            if (!perFn.has(key)) perFn.set(key, fn(...args));
            return perFn.get(key) as R;
        },
}));

/** Who asked the API for what: the path and the params of every call. */
const { api, binders } = vi.hoisted(() => {
    const binders: { id: string; name: string; kind: "manual"; count: number; pokedex: unknown }[] = [];
    const api = vi.fn(async (path: string, init: { params?: Record<string, unknown> }) => {
        if (path.endsWith("/profile")) return { displayName: "Bart", username: "bart", avatarUrl: null };
        if (path.endsWith("/folders")) return { folders: binders };
        if (path === "/public/species") return { entries: [] };
        const params = init.params ?? {};
        // The count asks for one item; the paged read for a page; the Pokédex read for 500.
        if (params.limit === 1) return { total: params.list === "wishlist" ? 7 : 42, copies: params.list === "wishlist" ? 8 : 45, value: 12.5 };
        return { cards: [], total: 42, copies: 45, value: 12.5, facets: { sets: [{ name: `limit ${String(params.limit)}`, title: "T" }], rarities: [] } };
    });
    return { api, binders };
});
vi.mock("@/lib/api", () => ({ ApiError: class extends Error {}, api }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => unknown) => fn, updateTag: vi.fn(), revalidatePath: vi.fn() }));

const { getPublicProfile, getPublicBinders, readPublicList } = await import("@/lib/public-profile");
const { getDexNames } = await import("@/lib/pokedex");

const DEX_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const BOX_ID = "16fd2706-8baf-433b-82eb-8c7fada847da";

const calls = (match: (path: string, params: Record<string, unknown>) => boolean) =>
    (api.mock.calls as unknown as [string, { params?: Record<string, unknown> }][]).filter(([path, init]) => match(path, init.params ?? {})).length;
const cardCalls = (limit: number) => calls((path, params) => path.endsWith("/cards") && params.limit === limit);

beforeEach(() => {
    api.mockClear();
    requestMemo.clear();
    binders.length = 0;
});

describe("the public page's reads in one request", () => {
    it("reads the profile once for the metadata and the page together", async () => {
        // generateMetadata and the page each ask; the second is answered from the request's cache.
        await Promise.all([getPublicProfile("bart"), getPublicProfile("bart")]);
        await getPublicProfile("bart");
        expect(calls((path) => path.endsWith("/profile"))).toBe(1);
    });

    it("reads the binders and the Pokémon names once too", async () => {
        await Promise.all([getPublicBinders("bart"), getPublicBinders("bart"), getDexNames(), getDexNames()]);
        expect(calls((path) => path.endsWith("/folders"))).toBe(1);
        expect(calls((path) => path === "/public/species")).toBe(1);
    });
});

describe("readPublicList", () => {
    it("takes the collection's count and worth off the paged read when nothing is narrowed or chosen", async () => {
        const reads = await readPublicList("bart", readPublicListQuery({}), { wishlistPublic: false });
        expect(reads.owned).toEqual({ count: 45, value: 12.5 });
        expect(cardCalls(1)).toBe(0);
        expect(cardCalls(100)).toBe(1);
        expect(reads.wishes).toBeNull();
    });

    it("still counts the wishlist on its own, where the owner shows it", async () => {
        const reads = await readPublicList("bart", readPublicListQuery({}), { wishlistPublic: true });
        expect(reads.wishes).toEqual({ count: 8, value: 12.5 });
        expect(calls((path, params) => path.endsWith("/cards") && params.limit === 1 && params.list === "wishlist")).toBe(1);
        expect(calls((path, params) => path.endsWith("/cards") && params.limit === 1 && params.list === undefined)).toBe(0);
    });

    it("counts the whole collection apart once a search narrows the page", async () => {
        const reads = await readPublicList("bart", readPublicListQuery({ q: "pikachu" }), { wishlistPublic: false });
        expect(reads.owned).toEqual({ count: 45, value: 12.5 });
        expect(cardCalls(1)).toBe(1);
        expect(cardCalls(100)).toBe(1);
    });

    it("counts the whole collection apart when another list is open", async () => {
        const query = readPublicListQuery({ list: "wishlist" });
        await readPublicList("bart", query, { wishlistPublic: true });
        expect(calls((path, params) => path.endsWith("/cards") && params.limit === 1 && params.list === undefined)).toBe(1);
    });

    it("skips the paged read for a Pokédex binder and takes the facets from its own first page", async () => {
        binders.push({ id: DEX_ID, name: "Dex", kind: "manual", count: 3, pokedex: { missing: true } });
        const reads = await readPublicList("bart", readPublicListQuery({ folder: DEX_ID }), { wishlistPublic: false });
        expect(cardCalls(100)).toBe(0);
        expect(reads.page).toBeNull();
        expect(reads.facets.sets.map((s) => s.name)).toEqual(["limit 500"]);
        expect(reads.dex).not.toBeNull();
        await reads.dex;
        expect(cardCalls(500)).toBe(1);
        // A binder is chosen, so the line under the name still counts the collection itself.
        expect(cardCalls(1)).toBe(1);
    });

    it("keeps the paged read for a binder that is not a Pokédex", async () => {
        binders.push({ id: BOX_ID, name: "Box", kind: "manual", count: 3, pokedex: null });
        const reads = await readPublicList("bart", readPublicListQuery({ folder: BOX_ID }), { wishlistPublic: false });
        expect(reads.binder?.id).toBe(BOX_ID);
        expect(reads.dex).toBeNull();
        expect(cardCalls(100)).toBe(1);
        expect(cardCalls(500)).toBe(0);
    });
});
