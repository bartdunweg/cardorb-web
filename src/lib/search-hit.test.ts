import { describe, expect, it } from "vitest";
import { searchHitDescription, takenHit } from "./search-hit";

const hit = { id: "me05-085", set: "Pitch Black", number: "085", rarity: "Common", owned: false, wishlist: false, quantity: 0 };

describe("searchHitDescription", () => {
    it("says where the card is from, and nothing more for one you do not have", () => {
        expect(searchHitDescription(hit)).toBe("Pitch Black · #085 · Common");
    });
    it("says you have it, and how many where that is more than one", () => {
        expect(searchHitDescription({ ...hit, owned: true, quantity: 1 })).toBe("Pitch Black · #085 · Common · In your collection");
        expect(searchHitDescription({ ...hit, owned: true, quantity: 3 })).toBe("Pitch Black · #085 · Common · In your collection · 3 copies");
        expect(searchHitDescription({ ...hit, wishlist: true })).toBe("Pitch Black · #085 · Common · On your wishlist");
    });
});

describe("takenHit", () => {
    it("marks the one hit the sheet took, by the list it went to, and leaves the rest", () => {
        const other = { ...hit, id: "sv1-1" };
        expect(takenHit([hit, other], hit.id, "collection")).toEqual([{ ...hit, owned: true, quantity: 1 }, other]);
        expect(takenHit([hit], hit.id, "wishlist")).toEqual([{ ...hit, wishlist: true }]);
    });
    it("a wish that becomes a copy is owned and no longer wished, and counts up", () => {
        expect(takenHit([{ ...hit, wishlist: true, quantity: 2 }], hit.id, "collection")[0]).toMatchObject({ owned: true, wishlist: false, quantity: 3 });
    });
});
