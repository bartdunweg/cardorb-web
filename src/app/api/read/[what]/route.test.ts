import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    session,
    cardFacts,
    listRows,
    moversFor,
    warmList,
    loadMoreCards,
    countCards,
    searchMyCards,
    collectionIndex,
    suggestCardTitles,
    searchPokemon,
    listSetsShelf,
    countShelf,
} = vi.hoisted(() => ({
    session: vi.fn(),
    cardFacts: vi.fn(),
    listRows: vi.fn(),
    moversFor: vi.fn(),
    warmList: vi.fn(),
    loadMoreCards: vi.fn(),
    countCards: vi.fn(),
    searchMyCards: vi.fn(),
    collectionIndex: vi.fn(),
    suggestCardTitles: vi.fn(),
    searchPokemon: vi.fn(),
    listSetsShelf: vi.fn(),
    countShelf: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ session }));
vi.mock("@/app/(app)/dashboard/cards/actions", () => ({
    cardFacts,
    cardFactsMany: vi.fn(),
    cardPriceHistory: vi.fn(),
    listRows,
    listSetRows: vi.fn(),
    seriesLogo: vi.fn(),
    searchMyCards,
    collectionIndex,
    suggestCardTitles,
    searchPokemon,
}));
vi.mock("@/app/(app)/dashboard/collections/actions", () => ({ loadFacets: vi.fn() }));
vi.mock("@/app/(app)/dashboard/(home)/actions", () => ({ moversFor }));
vi.mock("@/app/(app)/dashboard/list-actions", () => ({ warmList, loadMoreCards, countCards }));
vi.mock("@/app/(app)/dashboard/sets/actions", () => ({ listSetsShelf, countShelf }));
vi.mock("@/lib/collections", () => ({ getFolderChoices: vi.fn() }));

const { GET } = await import("./route");

const get = (what: string, query = "") => GET(new Request(`https://cardorb.com/api/read/${what}${query}`), { params: Promise.resolve({ what }) });

/** A sheet's reads by GET: the caller's own answers from their session, the action's answer as it was, and nothing without a session. */
describe("GET /api/read/[what]", () => {
    beforeEach(() => {
        session.mockReset().mockResolvedValue({ userId: "u1", token: "t" });
        cardFacts.mockReset().mockResolvedValue({ illustrator: "Mitsuhiro Arita" });
        listRows.mockReset().mockResolvedValue([]);
        moversFor.mockReset().mockResolvedValue(null);
        warmList.mockReset().mockResolvedValue(undefined);
    });

    it("answers a card's facts as the action does, never from a cache", async () => {
        const res = await get("facts", "?id=base1-4&language=ja");
        expect(res.status).toBe(200);
        expect(res.headers.get("cache-control")).toBe("no-store");
        expect(await res.json()).toEqual({ illustrator: "Mitsuhiro Arita" });
        expect(cardFacts).toHaveBeenCalledWith("base1-4", "ja");
    });

    it("is a 401 without a session, and reads nothing", async () => {
        session.mockResolvedValue(null);
        expect((await get("facts", "?id=base1-4")).status).toBe(401);
        expect(cardFacts).not.toHaveBeenCalled();
    });

    it("is a 404 for a read it does not have, a prototype's name included", async () => {
        expect((await get("constructor")).status).toBe(404);
        expect((await get("addCard")).status).toBe(404);
    });

    it("is a 400 for an address its schema refuses", async () => {
        expect((await get("facts")).status).toBe(400);
        expect((await get("movers", "?period=constructor")).status).toBe(400);
        expect(moversFor).not.toHaveBeenCalled();
    });

    it("answers null where the action had no answer, so the client falls back as it did", async () => {
        const res = await get("movers", "?period=1m");
        expect(await res.json()).toBeNull();
        expect(moversFor).toHaveBeenCalledWith("1m");
    });

    it("reads a card's rows by its names", async () => {
        await get("rows", "?set=Base&number=4&name=Charizard&set_name=Base+Set");
        expect(listRows).toHaveBeenCalledWith({ set: "Base", number: "4", name: "Charizard", set_name: "Base Set" });
    });
});

const input = (value: unknown) => `?input=${encodeURIComponent(JSON.stringify(value))}`;

/** The reads a list and the search boxes make while in use: a structured input in one JSON value, bounded and checked. */
describe("GET /api/read/[what], the list and search reads", () => {
    beforeEach(() => {
        session.mockReset().mockResolvedValue({ userId: "u1", token: "t" });
        for (const fn of [loadMoreCards, countCards, searchMyCards, collectionIndex, suggestCardTitles, searchPokemon, listSetsShelf, countShelf])
            fn.mockReset().mockResolvedValue(null);
    });

    it("hands a list's filter to the next batch, with its arrays and flags, and drops what the filter does not know", async () => {
        const res = await get("more", input({ set: ["base1", "base2"], wishlist: true, offset: 48, facets: true, userId: "someone-else" }));
        expect(res.status).toBe(200);
        expect(loadMoreCards).toHaveBeenCalledWith({ set: ["base1", "base2"], wishlist: true, offset: 48 });
    });

    it("is a 400 for an input that is not JSON, too long, or of the wrong shape, and reads nothing", async () => {
        expect((await get("more", "?input=%7Bnot-json")).status).toBe(400);
        expect((await get("more", input({ offset: -1 }))).status).toBe(400);
        expect((await get("count", input({ q: "x".repeat(9000) }))).status).toBe(400);
        expect((await get("catalogue", input({ q: "char", page: 51 }))).status).toBe(400);
        expect((await get("titles", input({ q: "c" }))).status).toBe(400);
        expect(loadMoreCards).not.toHaveBeenCalled();
        expect(countCards).not.toHaveBeenCalled();
        expect(searchPokemon).not.toHaveBeenCalled();
        expect(suggestCardTitles).not.toHaveBeenCalled();
    });

    it("asks the searches with the term and the chips apart, as the actions take them", async () => {
        await get("catalogue", input({ q: "charizard", set: "Base", language: "ja", page: 2 }));
        expect(searchPokemon).toHaveBeenCalledWith("charizard", { set: "Base", language: "ja" }, 2);
        await get("my-cards", input({ q: "pika", rarity: "Common" }));
        expect(searchMyCards).toHaveBeenCalledWith("pika", { rarity: "Common" });
        await get("titles", input({ q: "char", collectionId: "c1" }));
        expect(suggestCardTitles).toHaveBeenCalledWith("char", { collectionId: "c1" });
        await get("title-index", input({ favoritesOnly: true }));
        expect(collectionIndex).toHaveBeenCalledWith({ favoritesOnly: true });
    });

    it("reads an unknown shelf language as English, as the action did", async () => {
        await get("sets-shelf", "?language=xx");
        expect(listSetsShelf).toHaveBeenCalledWith("en");
        await get("shelf-count", "?language=ja&progress=complete&q=base");
        expect(countShelf).toHaveBeenCalledWith({ language: "ja", progress: "complete", q: "base" });
    });

    it("is a 401 without a session for these too", async () => {
        session.mockResolvedValue(null);
        expect((await get("catalogue", input({ q: "charizard", page: 1 }))).status).toBe(401);
        expect(searchPokemon).not.toHaveBeenCalled();
    });
});
