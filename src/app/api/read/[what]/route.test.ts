import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    session,
    cardFacts,
    cardFactsMany,
    cardPriceHistory,
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
    cardFactsMany: vi.fn(),
    cardPriceHistory: vi.fn(),
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
    cardFactsMany,
    cardPriceHistory,
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
vi.mock("@/app/(app)/sets/actions", () => ({ listSetsShelf, countShelf }));
vi.mock("@/lib/binders", () => ({ getBinderChoices: vi.fn() }));

const { GET } = await import("./route");

const get = (what: string, query = "") => GET(new Request(`https://cardorb.com/api/read/${what}${query}`), { params: Promise.resolve({ what }) });

/** A sheet's reads by GET: the caller's own answers from their session, the action's answer as it was, and nothing without a session. */
describe("GET /api/read/[what]", () => {
    beforeEach(() => {
        session.mockReset().mockResolvedValue({ userId: "u1", token: "t" });
        cardFacts.mockReset().mockResolvedValue({ illustrator: "Mitsuhiro Arita" });
        cardPriceHistory.mockReset().mockResolvedValue({ points: [], listings: {} });
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

    /* A card's facts and its price are the catalogue's, not a reader's: the set page prints the
       same figure beside every tile for a visitor, so the sheet over it answers one too. */
    it("answers a card's facts and its price without a session", async () => {
        session.mockResolvedValue(null);
        const facts = await get("facts", "?id=base1-4");
        expect(facts.status).toBe(200);
        expect(await facts.json()).toEqual({ illustrator: "Mitsuhiro Arita" });
        expect(cardFacts).toHaveBeenCalledWith("base1-4", undefined);

        cardPriceHistory.mockResolvedValue({ points: [{ date: "2026-09-22", market: 823.98 }], listings: {} });
        const prices = await get("prices", "?id=base1-4");
        expect(prices.status).toBe(200);
        expect(await prices.json()).toEqual({ points: [{ date: "2026-09-22", market: 823.98 }], listings: {} });
        expect(cardPriceHistory).toHaveBeenCalledWith("base1-4");
        // Not the session's own: nothing here is read per person.
        expect(session).not.toHaveBeenCalled();
    });

    /* A set page asks for a whole page of tiles' facts at once. The batch is the single card's
       facts many times over, so it answers the same caller: a visitor on Browse got a 401 here
       while the card they opened next was answered. */
    it("answers a page of cards' facts without a session", async () => {
        session.mockResolvedValue(null);
        cardFactsMany.mockResolvedValue({ "base1-4": { illustrator: "Mitsuhiro Arita" } });
        const many = await get("facts-many", "?id=base1-1&id=base1-4");
        expect(many.status).toBe(200);
        expect(cardFactsMany).toHaveBeenCalledWith(["base1-1", "base1-4"], undefined);
        expect(session).not.toHaveBeenCalled();
    });

    /* Search is open, the owner's first word on it, and the palette leans on four reads for it:
       the hits, the shelf behind its Set chip, the counts beside Browse's filters, a series'
       logo on the sheet. Each is the catalogue alone. A visitor got a 401 for all four. */
    it("answers a search and the shelf's reads without a session", async () => {
        session.mockResolvedValue(null);
        searchPokemon.mockResolvedValue({ items: [], total: 0 });
        listSetsShelf.mockResolvedValue({ series: [], unavailable: false });
        expect((await get("sets-shelf")).status).toBe(200);
        expect(listSetsShelf).toHaveBeenCalled();
        expect((await get("series-logo", "?series=Base")).status).not.toBe(401);
        expect(session).not.toHaveBeenCalled();
    });

    it("is a 401 without a session for a read about the reader, and reads nothing", async () => {
        session.mockResolvedValue(null);
        expect((await get("rows", "?name=Charizard&set=Base&number=4")).status).toBe(401);
        expect(listRows).not.toHaveBeenCalled();
        expect((await get("folders")).status).toBe(401);
        expect((await get("warm-list", "?list=wishlist")).status).toBe(401);
        expect(warmList).not.toHaveBeenCalled();
        expect((await get("facets")).status).toBe(401);
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
        expect(moversFor).toHaveBeenCalledWith("1m", "all");
    });

    it("reads the movers of the list Home is about, and the collection's for anything else", async () => {
        await get("movers", "?period=7d&list=wishlist");
        expect(moversFor).toHaveBeenLastCalledWith("7d", "wishlist");
        await get("movers", "?period=7d&list=70b334a6-3a53-4ee5-905f-fd13a0d4ed9f");
        expect(moversFor).toHaveBeenLastCalledWith("7d", "70b334a6-3a53-4ee5-905f-fd13a0d4ed9f");
        await get("movers", "?period=7d&list=everything");
        expect(moversFor).toHaveBeenLastCalledWith("7d", "all");
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
        await get("shelf-count", input({ language: "ja", progress: "complete", q: "base", series: ["Base"], year: ["1999"] }));
        expect(countShelf).toHaveBeenCalledWith({ language: "ja", progress: "complete", q: "base", series: ["Base"], year: ["1999"] });
        // Left out, the lists are empty rather than missing.
        await get("shelf-count", input({ language: "en" }));
        expect(countShelf).toHaveBeenLastCalledWith({ language: "en", progress: "all", series: [], year: [] });
    });

    // It used to be a 401: search was behind the wall with the rest. The owner opened it on
    // 2026-09-22, so a visitor's query is answered, and without marks (the route decides that).
    it("answers a search without a session", async () => {
        session.mockResolvedValue(null);
        searchPokemon.mockResolvedValue({ items: [], total: 0 });
        expect((await get("catalogue", input({ q: "charizard", page: 1 }))).status).toBe(200);
        expect(searchPokemon).toHaveBeenCalled();
    });
});
