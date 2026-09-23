import { describe, expect, it } from "vitest";
import { hitFromRows, searchHitDescription, takenHit } from "./search-hit";

const hit = { id: "me05-085", set: "Pitch Black", number: "085", rarity: "Common", holding: { owned: false, wishlist: false, quantity: 0 } };
/** The same hit as it comes off the open catalogue: nobody was asked what is held. */
const unasked = { ...hit, holding: null };

describe("searchHitDescription", () => {
    it("says where the card is from, and nothing more for one you do not have", () => {
        expect(searchHitDescription(hit)).toBe("Pitch Black · #085 · Common");
    });
    it("says you have it, and how many where that is more than one", () => {
        expect(searchHitDescription({ ...hit, holding: { owned: true, wishlist: false, quantity: 1 } })).toBe(
            "Pitch Black · #085 · Common · In your collection",
        );
        expect(searchHitDescription({ ...hit, holding: { owned: true, wishlist: false, quantity: 3 } })).toBe(
            "Pitch Black · #085 · Common · In your collection · 3 copies",
        );
        expect(searchHitDescription({ ...hit, holding: { owned: false, wishlist: true, quantity: 0 } })).toBe("Pitch Black · #085 · Common · On your wishlist");
    });
    it("says nothing about a collection nobody was asked about", () => {
        expect(searchHitDescription(unasked)).toBe("Pitch Black · #085 · Common");
    });
});

describe("takenHit", () => {
    it("marks the one hit the sheet took, by the list it went to, and leaves the rest", () => {
        const other = { ...hit, id: "sv1-1" };
        expect(takenHit([hit, other], hit.id, "collection")).toEqual([{ ...hit, holding: { owned: true, wishlist: false, quantity: 1 } }, other]);
        expect(takenHit([hit], hit.id, "wishlist")).toEqual([{ ...hit, holding: { owned: false, wishlist: true, quantity: 0 } }]);
    });
    it("a wish that becomes a copy is owned and no longer wished, and counts up", () => {
        expect(takenHit([{ ...hit, holding: { owned: false, wishlist: true, quantity: 2 } }], hit.id, "collection")[0]).toMatchObject({
            holding: { owned: true, wishlist: false, quantity: 3 },
        });
    });
    // The write is the answer: from here on this hit knows what is held, where before it did not.
    it("gives a hit nobody had been asked about the holding the press just made", () => {
        expect(takenHit([unasked], hit.id, "collection")[0]?.holding).toEqual({ owned: true, wishlist: false, quantity: 1 });
    });
});

describe("hitFromRows", () => {
    const held = { ...hit, holding: { owned: true, wishlist: false, quantity: 2 } };
    it("reads the rows the way the API marks a hit", () => {
        expect(
            hitFromRows(held, [
                { owned: true, wishlist: false, quantity: 3 },
                { owned: true, wishlist: false, quantity: null },
            ]),
        ).toMatchObject({ holding: { owned: true, wishlist: false, quantity: 4 } });
        expect(hitFromRows(held, [{ owned: false, wishlist: true, quantity: 1 }])).toMatchObject({
            holding: { owned: false, wishlist: true, quantity: 0 },
        });
    });
    it("no rows left is a card you do not have", () => {
        expect(hitFromRows(held, [])).toMatchObject({ holding: { owned: false, wishlist: false, quantity: 0 } });
    });
});
