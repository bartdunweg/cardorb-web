import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "@/lib/cards";
import {
    PRICES_FRESH_MS,
    awaitRows,
    forgetCards,
    knownCardFacts,
    knownPriceHistory,
    knownRows,
    preloadCardFacts,
    preloadPriceHistory,
    rememberCopies,
    warmCard,
    warmCardFacts,
    warmSetRows,
} from "./card-memo";

/*
 * A tile warms what its sheet will ask for while the pointer rests on it, and the sheet asks
 * again when it opens. One card, one request each, however many times either asks, and a
 * second ask while the first is still out joins it rather than sending another.
 */

const facts = vi.fn();
const many = vi.fn();
const history = vi.fn();
const setRows = vi.fn();
vi.mock("@/lib/reads", () => ({
    cardFacts: (id: string, language?: string | null) => facts(id, language),
    cardFactsMany: (ids: string[], language?: string | null) => many(ids, language),
    cardPriceHistory: (id: string) => history(id),
    listSetRows: (set: string) => setRows(set),
}));
vi.mock("@/components/app/card-detail-slideout", () => ({}));

describe("card memo", () => {
    beforeEach(() => {
        forgetCards();
        facts.mockReset().mockResolvedValue({ illustrator: "Mitsuhiro Arita" });
        history.mockReset().mockResolvedValue([]);
        many.mockReset().mockImplementation(async (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { illustrator: `of ${id}` }])));
    });

    it("asks once per card, across the tile and the sheet", async () => {
        warmCard("sv1-1");
        await Promise.all([preloadCardFacts("sv1-1"), preloadPriceHistory("sv1-1")]);
        await preloadCardFacts("sv1-1");
        expect(facts).toHaveBeenCalledTimes(1);
        expect(history).toHaveBeenCalledTimes(1);
    });

    it("keeps a Japanese card's facts apart from the English card under the same id", async () => {
        facts.mockImplementation(async (id: string, language?: string | null) => ({ illustrator: `${language ?? "en"} ${id}` }));
        await preloadCardFacts("neo4-100");
        await preloadCardFacts("neo4-100", "ja");
        expect(facts).toHaveBeenCalledWith("neo4-100", "ja");
        expect(knownCardFacts("neo4-100")).toEqual({ illustrator: "en neo4-100" });
        expect(knownCardFacts("neo4-100", "ja")).toEqual({ illustrator: "ja neo4-100" });
    });

    it("asks a Japanese grid's page of the Japanese catalogue", async () => {
        warmCardFacts(["SV2a-001"], "ja");
        await preloadCardFacts("SV2a-001", "ja");
        expect(many).toHaveBeenCalledWith(["SV2a-001"], "ja");
        expect(facts).not.toHaveBeenCalled();
        expect(knownCardFacts("SV2a-001", "ja")).toEqual({ illustrator: "of SV2a-001" });
        expect(knownCardFacts("SV2a-001")).toBeUndefined();
    });

    it("knows nothing before asking, and keeps a null answer", async () => {
        expect(knownCardFacts("sv1-2")).toBeUndefined();
        facts.mockResolvedValue(null);
        await preloadCardFacts("sv1-2");
        expect(knownCardFacts("sv1-2")).toBeNull();
        await preloadCardFacts("sv1-2");
        expect(facts).toHaveBeenCalledTimes(1);
    });

    it("reads a line again once it is no longer fresh, and draws the known one meanwhile", async () => {
        vi.useFakeTimers();
        try {
            const sunday = [{ date: "2026-09-13", market: 1, holo: null }];
            const monday = [...sunday, { date: "2026-09-14", market: 2, holo: null }];
            history.mockResolvedValueOnce(sunday).mockResolvedValueOnce(monday);
            await preloadPriceHistory("sv1-3");
            await preloadPriceHistory("sv1-3");
            expect(history).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(PRICES_FRESH_MS);
            const again = preloadPriceHistory("sv1-3");
            expect(knownPriceHistory("sv1-3")).toBe(sunday);
            expect(await again).toBe(monday);
            expect(history).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it("keeps a line with readings when a later read comes back empty", async () => {
        vi.useFakeTimers();
        try {
            const line = [{ date: "2026-09-14", market: 2, holo: null }];
            history.mockResolvedValueOnce(line).mockResolvedValueOnce([]);
            await preloadPriceHistory("sv1-4");
            vi.advanceTimersByTime(PRICES_FRESH_MS);
            expect(await preloadPriceHistory("sv1-4")).toBe(line);
            expect(knownPriceHistory("sv1-4")).toBe(line);
        } finally {
            vi.useRealTimers();
        }
    });

    /* A grid asks for its cards' facts in one request a page, so a sheet opened on any of them has
       them on its first paint and asks nothing. */
    it("knows a grid's cards after one request, and the sheet asks nothing more", async () => {
        warmCardFacts(["sv1-1", "sv1-2", null, "sv1-1"]);
        expect(many).toHaveBeenCalledTimes(1);
        expect(many).toHaveBeenCalledWith(["sv1-1", "sv1-2"], undefined);
        await preloadCardFacts("sv1-2");
        expect(knownCardFacts("sv1-1")).toEqual({ illustrator: "of sv1-1" });
        expect(await preloadCardFacts("sv1-1")).toEqual({ illustrator: "of sv1-1" });
        expect(facts).not.toHaveBeenCalled();
        warmCardFacts(["sv1-1", "sv1-2"]);
        expect(many).toHaveBeenCalledTimes(1);
    });

    it("asks a page at most 250 cards at a time", () => {
        warmCardFacts(Array.from({ length: 251 }, (_, i) => `sv1-${i}`));
        expect(many).toHaveBeenCalledTimes(2);
        expect(many.mock.calls[1]?.[0]).toEqual(["sv1-250"]);
    });

    /* Left out of a page is not "the catalogue cannot place it": the card alone may still answer. */
    it("leaves a card the page did not answer unknown, and its sheet asks for it alone", async () => {
        many.mockResolvedValue({});
        warmCardFacts(["sv1-9"]);
        expect(await preloadCardFacts("sv1-9")).toEqual({ illustrator: "Mitsuhiro Arita" });
        expect(facts).toHaveBeenCalledTimes(1);
    });

    it("asks nothing for a card already known or asked", async () => {
        await preloadCardFacts("sv1-5");
        void preloadCardFacts("sv1-6");
        warmCardFacts(["sv1-5", "sv1-6"]);
        expect(many).not.toHaveBeenCalled();
    });

    it("warms nothing for a card the catalogue never placed", () => {
        warmCard(null);
        expect(facts).not.toHaveBeenCalled();
        expect(history).not.toHaveBeenCalled();
    });
});

/*
 * A set page's rows, asked once per drawing of the page, so the sheet of a card you hold opens on
 * its row and its copies instead of reading them after the tap.
 */
describe("set rows", () => {
    const row = (id: string, number: string, over: Partial<Card> = {}) =>
        ({ id, name: "Charizard", set: "Base", set_name: "Base Set", number, owned: true, wishlist: false, quantity: 1, ...over }) as Card;
    const charizard = { set: "Base Set", number: "4", name: "Charizard" };

    beforeEach(() => {
        forgetCards();
        setRows.mockReset().mockResolvedValue([row("a", "4"), row("b", "4", { condition: "Played" }), row("c", "5", { owned: false, wishlist: true })]);
    });

    it("knows a card's rows once its set has answered, and nothing before", async () => {
        warmSetRows("Base Set", {});
        expect(knownRows(charizard)).toBeUndefined();
        expect((await awaitRows(charizard))?.map((r) => r.id)).toEqual(["a", "b"]);
        expect(knownRows(charizard)?.map((r) => r.id)).toEqual(["a", "b"]);
        // A row as the sheet holds one, filed under another name than the title the page asked by.
        expect(knownRows({ set: "Base", set_name: "Base Set", number: "5", name: "Charizard" })?.map((r) => r.id)).toEqual(["c"]);
        expect(knownRows({ set: "Jungle", number: "4", name: "Charizard" })).toBeUndefined();
    });

    it("asks once per drawing of the page, and again for the next", async () => {
        const drawing = {};
        warmSetRows("Base Set", drawing);
        warmSetRows("Base Set", drawing);
        expect(setRows).toHaveBeenCalledTimes(1);
        await awaitRows(charizard);
        warmSetRows("Base Set", {});
        expect(setRows).toHaveBeenCalledTimes(2);
        // The rows of the drawing before are not shown while the new ones are on the way.
        expect(knownRows(charizard)).toBeUndefined();
    });

    it("keeps nothing from an answer that was not the whole set", async () => {
        setRows.mockResolvedValue(null);
        warmSetRows("Base Set", {});
        expect(await awaitRows(charizard)).toBeUndefined();
        expect(knownRows(charizard)).toBeUndefined();
    });

    it("lets an older answer that lands late write nothing", async () => {
        let first: (rows: Card[]) => void = () => undefined;
        setRows.mockImplementationOnce(() => new Promise((resolve) => (first = resolve)));
        warmSetRows("Base Set", {});
        warmSetRows("Base Set", {});
        await awaitRows(charizard);
        first([row("old", "4")]);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(knownRows(charizard)?.map((r) => r.id)).toEqual(["a", "b"]);
    });

    it("puts the copies a sheet read in place of the ones kept", async () => {
        warmSetRows("Base Set", {});
        await awaitRows(charizard);
        rememberCopies(charizard, [row("a", "4", { quantity: 3 })]);
        expect(knownRows(charizard)?.map((r) => [r.id, r.quantity])).toEqual([["a", 3]]);
        expect(knownRows({ set: "Base Set", number: "5", name: "Charizard" })?.map((r) => r.id)).toEqual(["c"]);
    });
});
