import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRICES_FRESH_MS, forgetCards, knownCardFacts, knownPriceHistory, preloadCardFacts, preloadPriceHistory, warmCard, warmCardFacts } from "./card-memo";

/*
 * A tile warms what its sheet will ask for while the pointer rests on it, and the sheet asks
 * again when it opens. One card, one request each, however many times either asks, and a
 * second ask while the first is still out joins it rather than sending another.
 */

const facts = vi.fn();
const many = vi.fn();
const history = vi.fn();
vi.mock("@/app/(app)/dashboard/cards/actions", () => ({
    cardFacts: (id: string) => facts(id),
    cardFactsMany: (ids: string[]) => many(ids),
    cardPriceHistory: (id: string) => history(id),
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
        expect(many).toHaveBeenCalledWith(["sv1-1", "sv1-2"]);
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
