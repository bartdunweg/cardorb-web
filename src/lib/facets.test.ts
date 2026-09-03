import { describe, expect, it } from "vitest";
import { facetsFromSets } from "./facets";

describe("facetsFromSets", () => {
    it("lists the sets that hold an owned copy, by title, and the rarities held, once each", () => {
        const facets = facetsFromSets([
            {
                name: "jungle",
                title: "Jungle",
                cards: [
                    {
                        variants: [
                            { rarity: "Rare", owned: true },
                            { rarity: "Common", owned: true },
                        ],
                    },
                ],
            },
            {
                name: "base1",
                title: "Base Set",
                cards: [
                    {
                        variants: [
                            { rarity: "Common", owned: true },
                            { rarity: null, owned: true },
                        ],
                    },
                ],
            },
            { name: "fossil", title: "Fossil", cards: [{ variants: [{ rarity: "Ultra Rare", owned: false }] }] },
        ]);
        expect(facets.sets).toEqual([
            { name: "base1", title: "Base Set" },
            { name: "jungle", title: "Jungle" },
        ]);
        expect(facets.rarities).toEqual(["Common", "Rare"]);
    });
});
