import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetCards, knownCardFacts, preloadCardFacts, preloadPriceHistory, warmCard } from "./card-memo";

/*
 * A tile warms what its sheet will ask for while the pointer rests on it, and the sheet asks
 * again when it opens. One card, one request each, however many times either asks, and a
 * second ask while the first is still out joins it rather than sending another.
 */

const facts = vi.fn();
const history = vi.fn();
vi.mock("@/app/(app)/dashboard/cards/actions", () => ({
    cardFacts: (id: string) => facts(id),
    cardPriceHistory: (id: string) => history(id),
}));
vi.mock("@/components/app/card-detail-slideout", () => ({}));

describe("card memo", () => {
    beforeEach(() => {
        forgetCards();
        facts.mockReset().mockResolvedValue({ illustrator: "Mitsuhiro Arita" });
        history.mockReset().mockResolvedValue([]);
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

    it("warms nothing for a card the catalogue never placed", () => {
        warmCard(null);
        expect(facts).not.toHaveBeenCalled();
        expect(history).not.toHaveBeenCalled();
    });
});
