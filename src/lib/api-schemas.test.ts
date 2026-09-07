import { describe, expect, it } from "vitest";
import { cardItemSchema, cardsAnswer, catalogueSetsAnswer, folderItemSchema, statsAnswer } from "./api-shapes";

/** A card as the API sends one, with every key it promises. */
const wireCard = {
    id: "row-1",
    name: "Armarouge",
    number: "086",
    set: "pbl",
    setTitle: "Pitch Black",
    setAbbr: "PBL",
    rarity: "Illustration rare",
    gen: "Mega Evolution",
    type: "Fire",
    image: "/api/cover?url=x",
    imageHigh: null,
    speciesId: 936,
    tcgId: "pbl-086",
    owned: true,
    finish: "holo",
    foilPattern: "cosmos",
    quantity: 1,
    condition: "near-mint",
    grade: null,
    language: "en",
    purchasePrice: null,
    purchaseDate: null,
    notes: null,
    isFavorite: false,
    acquiredAt: null,
    collectionId: null,
    price: null,
    priceHolo: null,
};

describe("what the schemas refuse", () => {
    it("fails on a field the API renamed away", () => {
        const { name: _gone, ...withoutName } = wireCard;
        const out = cardItemSchema.safeParse(withoutName);
        expect(out.success).toBe(false);
        expect(out.error?.issues[0]?.path).toEqual(["name"]);
    });

    it("fails on a number that arrives as a string", () => {
        // The failure this replaces: `quantity` reached a component as "1" and every sum of it
        // became a concatenation.
        expect(cardItemSchema.safeParse({ ...wireCard, quantity: "1" }).success).toBe(false);
    });

    it("fails on an envelope missing its count, rather than reading it as zero", () => {
        expect(cardsAnswer.safeParse({ cards: [wireCard] }).success).toBe(false);
    });
});

describe("what the schemas let through", () => {
    it("reads a word it does not know as 'not recorded', keeping the card", () => {
        // The API may name a finish before this app does. A card whose finish cannot be named is
        // still a card, and rejecting the answer would empty the whole list over one word.
        const out = cardItemSchema.parse({ ...wireCard, finish: "rainbow-secret", foilPattern: "galaxy" });
        expect(out.finish).toBeNull();
        expect(out.foilPattern).toBeNull();
        expect(out.name).toBe("Armarouge");
    });

    it("reads a key an older API never sent as null", () => {
        const { setAbbr: _absent, ...older } = wireCard;
        expect(cardItemSchema.parse(older).setAbbr).toBeNull();
    });

    it("keeps a folder from before rules and before public folders", () => {
        const folder = folderItemSchema.parse({ id: "f", name: "Kanto", createdAt: "2026-01-01", count: 12 });
        expect(folder).toMatchObject({ id: "f", count: 12 });
    });

    it("ignores a field the API added that this app does not read yet", () => {
        const out = cardItemSchema.parse({ ...wireCard, somethingNew: { deep: true } });
        expect(out).not.toHaveProperty("somethingNew");
        expect(out.id).toBe("row-1");
    });

    it("takes the stats and the sets exactly as the screens name them", () => {
        expect(statsAnswer.parse({ stats: { cards: 1, copies: 2, wishlist: 3, favorites: 4, sets: 5, value: 6, unpriced: 7 } }).stats.copies).toBe(2);
        const sets = catalogueSetsAnswer.parse({
            sets: [
                {
                    id: "pbl",
                    name: "Pitch Black",
                    series: "Mega Evolution",
                    releaseDate: null,
                    total: 100,
                    printedTotal: null,
                    logo: null,
                    symbol: null,
                    ownedCount: 3,
                    wishlistCount: 0,
                },
            ],
        });
        expect(sets.sets[0]).toMatchObject({ id: "pbl", localName: null });
    });
});
