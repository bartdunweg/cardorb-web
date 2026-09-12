import { describe, expect, it } from "vitest";
import { type CatalogueIndex, catalogueIndexSchema, searchIndex } from "./catalogue-index";

const index: CatalogueIndex = {
    version: "v1",
    sets: {
        "sv03.5": { name: "151", series: "Scarlet & Violet", date: "2023/09/22", image: "https://assets.tcgdex.net/en/sv/sv03.5" },
        base1: { name: "Base Set", series: "Base", date: "1999/01/09", image: null },
        svp: { name: "SVP Black Star Promos", series: "Scarlet & Violet", date: "2023/06/30", image: null },
    },
    cards: [
        ["sv03.5-006", "sv03.5", "006", "Charizard ex", "Double Rare", ["Fire"]],
        ["sv03.5-099", "sv03.5", "099", "Pecharunt ex", "Double Rare", ["Psychic"]],
        ["sv03.5-007", "sv03.5", "007", "Squirtle", "Common", ["Water"], "https://elsewhere/007"],
        ["base1-4", "base1", "4", "Charizard", "Rare Holo", ["Fire"], null],
        ["base1-58", "base1", "58", "Pikachu", "Common", ["Lightning"]],
        // A card TCGdex has no scan of: the copy holds the second catalogue's whole file.
        ["svp-085", "svp", "085", "Pikachu with Grey Felt Hat", "Promo", ["Lightning"], "https://images.pokemontcg.io/svp/85.png"],
        // The same, through the API's cover proxy, which is a path on the API's own origin.
        ["svp-102", "svp", "102", "Mew with Grey Felt Hat", "Promo", ["Psychic"], "/api/cover?url=https%3A%2F%2Flimitless%2FSVP_102.png"],
    ],
};

describe("catalogueIndexSchema", () => {
    it("reads what the API sends, with the seventh element optional", () => {
        expect(catalogueIndexSchema.safeParse(index).success).toBe(true);
        expect(catalogueIndexSchema.safeParse({ ...index, cards: [["x"]] }).success).toBe(false);
    });
});

describe("searchIndex", () => {
    it("matches every word against name, number and set name", () => {
        const { items, total } = searchIndex(index, "charizard");
        expect(items.map((c) => c.id)).toEqual(["sv03.5-006", "base1-4"]);
        expect(total).toBe(2);
        expect(searchIndex(index, "charizard 151").items.map((c) => c.id)).toEqual(["sv03.5-006"]);
        expect(searchIndex(index, "CHARIZARD base").items.map((c) => c.id)).toEqual(["base1-4"]);
    });

    it("answers what the name begins with first, the document's order inside a band", () => {
        // "char" is in Pecharunt too, and its printing is the newer one: the document would have
        // answered it first, which is the letters over what anyone meant.
        expect(searchIndex(index, "char").items.map((c) => c.id)).toEqual(["sv03.5-006", "base1-4", "sv03.5-099"]);
        // A word that is the set narrows; the name still decides the order.
        expect(searchIndex(index, "char 151").items.map((c) => c.id)).toEqual(["sv03.5-006", "sv03.5-099"]);
    });

    it("reads an energy word as the type filter, and the chips as the API does", () => {
        expect(searchIndex(index, "fire").items.map((c) => c.id)).toEqual(["sv03.5-006", "base1-4"]);
        expect(searchIndex(index, "", { type: "water" }).items.map((c) => c.id)).toEqual(["sv03.5-007"]);
        expect(searchIndex(index, "", { set: "Base Set" }).items.map((c) => c.id)).toEqual(["base1-4", "base1-58"]);
        expect(searchIndex(index, "pika", { set: "151" }).items).toEqual([]);
    });

    it("answers nothing for nothing", () => {
        expect(searchIndex(index, "   ")).toEqual({ items: [], total: 0 });
    });

    it("draws a hit as the palette reads one: scan at the set's folder unless the card says otherwise", () => {
        const inSet = searchIndex(index, "", { set: "151" }).items;
        const charizard = inSet.find((c) => c.id === "sv03.5-006");
        const squirtle = inSet.find((c) => c.id === "sv03.5-007");
        expect(charizard).toMatchObject({
            id: "sv03.5-006",
            tcgId: "sv03.5-006",
            name: "Charizard ex",
            set: "151",
            number: "006",
            rarity: "Double Rare",
            types: ["Fire"],
            series: "Scarlet & Violet",
            image: "https://assets.tcgdex.net/en/sv/sv03.5/006/low.webp",
            owned: false,
            wishlist: false,
            quantity: 0,
            price: null,
        });
        expect(squirtle?.image).toBe("https://elsewhere/007/low.webp");
        expect(searchIndex(index, "charizard base").items[0]?.image).toBeNull();
    });

    it("draws a whole file as the one size it is, and a proxy path off the API's origin", () => {
        const pikachu = searchIndex(index, "grey felt hat pikachu").items[0];
        expect(pikachu?.image).toBe("https://images.pokemontcg.io/svp/85.png");
        const mew = searchIndex(index, "grey felt hat mew").items[0];
        expect(mew?.image).toBe("https://api.cardorb.com/api/cover?url=https%3A%2F%2Flimitless%2FSVP_102.png");
    });

    it("pages twenty at a time", () => {
        const big: CatalogueIndex = {
            ...index,
            cards: Array.from({ length: 45 }, (_, i) => [`base1-${i}`, "base1", String(i), "Pikachu", null, []]),
        };
        expect(searchIndex(big, "pikachu", {}, 1).items).toHaveLength(20);
        expect(searchIndex(big, "pikachu", {}, 3).items).toHaveLength(5);
        expect(searchIndex(big, "pikachu", {}, 3).total).toBe(45);
    });
});
