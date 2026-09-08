import { describe, expect, it } from "vitest";
import { NO_FACETS, facetsFrom } from "./facets";

describe("facetsFrom", () => {
    it("fills in what an older API left out, so a menu is empty rather than absent", () => {
        expect(facetsFrom(undefined)).toEqual(NO_FACETS);
        // The answer of an API from before gens and types: the two it knows, and empty menus for the rest.
        expect(facetsFrom({ sets: [{ name: "base1", title: "Base Set" }], rarities: ["Rare Holo"] })).toEqual({
            sets: [{ name: "base1", title: "Base Set" }],
            rarities: ["Rare Holo"],
            gens: [],
            types: [],
        });
    });

    it("keeps what the API sent, in the order it sent it", () => {
        const raw = { sets: [], rarities: ["Common", "Rare"], gens: ["Scarlet & Violet", "Sword & Shield"], types: ["Fire", "Water"] };
        expect(facetsFrom(raw)).toEqual(raw);
    });
});
