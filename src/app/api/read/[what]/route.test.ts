import { beforeEach, describe, expect, it, vi } from "vitest";

const { session, cardFacts, listRows, moversFor, warmList } = vi.hoisted(() => ({
    session: vi.fn(),
    cardFacts: vi.fn(),
    listRows: vi.fn(),
    moversFor: vi.fn(),
    warmList: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ session }));
vi.mock("@/app/(app)/dashboard/cards/actions", () => ({
    cardFacts,
    cardFactsMany: vi.fn(),
    cardPriceHistory: vi.fn(),
    listRows,
    listSetRows: vi.fn(),
    seriesLogo: vi.fn(),
}));
vi.mock("@/app/(app)/dashboard/collections/actions", () => ({ loadFacets: vi.fn() }));
vi.mock("@/app/(app)/dashboard/(home)/actions", () => ({ moversFor }));
vi.mock("@/app/(app)/dashboard/list-actions", () => ({ warmList }));
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
