import { describe, expect, it } from "vitest";
import { absoluteImage, cardFromItem, pokemonCardFromBrowse, priceForCopy, publicCardFromItem, slotsFromEntries } from "./api-shapes";

describe("absoluteImage", () => {
    it("resolves a relative picture on the API's host and leaves an absolute one alone", () => {
        expect(absoluteImage("/api/cover?url=x")).toBe("https://api.cardorb.com/api/cover?url=x");
        expect(absoluteImage("https://assets.tcgdex.net/a.png")).toBe("https://assets.tcgdex.net/a.png");
        expect(absoluteImage(null)).toBeNull();
    });
});

describe("cardFromItem", () => {
    it("speaks the table's column names, and a wish is not owned", () => {
        const card = cardFromItem({
            id: "row",
            name: "Pikachu",
            number: "58",
            set: "base1",
            setTitle: "Base Set",
            rarity: "Common",
            gen: "Gen 1",
            type: "Lightning",
            image: "/api/cover?url=p",
            imageHigh: null,
            speciesId: 25,
            tcgId: "base1-58",
            owned: false,
            finish: null,
            quantity: 1,
            condition: null,
            grade: null,
            purchasePrice: null,
            purchaseDate: null,
            notes: null,
            isFavorite: true,
            acquiredAt: null,
            collectionId: "f",
            price: { low: 1, market: 4, avg30: 5, nm: { low: 3, mid: 6, high: 9 } },
            priceHolo: null,
        });
        expect(card).toMatchObject({
            price: 6,
            set_name: "Base Set",
            types: ["Lightning"],
            is_favorite: true,
            owned: false,
            wishlist: true,
            collection_id: "f",
            image_url: "https://api.cardorb.com/api/cover?url=p",
        });
    });
});

describe("priceForCopy", () => {
    const price = { low: 1, market: 4, avg30: 5, nm: { low: 3, mid: 6, high: 9 } };
    const holo = { low: 10, market: 40, avg30: 50, nm: { low: 30, mid: 60, high: 90 } };

    it("shows the Near Mint midpoint, and falls back to the market price", () => {
        expect(priceForCopy({ finish: null, price, priceHolo: null })).toBe(6);
        expect(priceForCopy({ finish: null, price: { ...price, nm: null }, priceHolo: null })).toBe(4);
        expect(priceForCopy({ finish: null, price: { low: 1, market: null, avg30: null, nm: null }, priceHolo: null })).toBeNull();
        expect(priceForCopy({ finish: null, price: null, priceHolo: null })).toBeNull();
    });

    it("prices a holo or reverse-holo copy as a holo, unless the holo price is missing", () => {
        expect(priceForCopy({ finish: "holo", price, priceHolo: holo })).toBe(60);
        expect(priceForCopy({ finish: "reverse-holo", price, priceHolo: holo })).toBe(60);
        expect(priceForCopy({ finish: "normal", price, priceHolo: holo })).toBe(6);
        expect(priceForCopy({ finish: "holo", price, priceHolo: null })).toBe(6);
    });
});

describe("publicCardFromItem", () => {
    it("makes one tile per card, with the copies as its quantity and the set's title as its set", () => {
        const card = publicCardFromItem({
            key: "Base Set-58",
            name: "Pikachu",
            number: "58",
            set: "base1",
            setTitle: "Base Set",
            rarity: "Common",
            gen: null,
            type: "Lightning",
            image: "/api/cover?url=x",
            speciesId: 25,
            tcgId: "base1-58",
            copies: 3,
        });
        expect(card).toMatchObject({ id: "Base Set-58", set_name: "Base Set", quantity: 3, types: ["Lightning"], finish: null, tcg_id: "base1-58" });
        expect(card.image_url).toMatch(/^https:\/\/.*\/api\/cover\?url=x$/);
    });
});

describe("slotsFromEntries", () => {
    it("counts caught Pokémon and cards", () => {
        const { slots, caughtNumbers, totalCards } = slotsFromEntries([
            { id: 1, name: "Bulbasaur", owned: 0, cards: [] },
            { id: 25, name: "Pikachu", owned: 2, cards: [{ key: "a", name: "Pikachu", image: "/p.png" }] },
        ]);
        expect(caughtNumbers).toBe(1);
        expect(totalCards).toBe(2);
        expect(slots[1]).toEqual({ number: 25, cards: [{ id: "a", name: "Pikachu", imageUrl: "https://api.cardorb.com/p.png" }] });
    });
});

describe("pokemonCardFromBrowse", () => {
    it("keeps what the catalogue knows and nulls the rest", () => {
        const c = pokemonCardFromBrowse({
            id: "sv1-1",
            number: "1",
            name: "Sprigatito",
            setName: "Scarlet & Violet",
            image: null,
            imageHigh: null,
            rarity: "Common",
            types: [],
            series: "Scarlet & Violet",
            owned: true,
            wishlist: false,
            quantity: 1,
            itemIds: ["row"],
        });
        expect(c).toMatchObject({ set: "Scarlet & Violet", types: null, hp: null, owned: true });
    });
});
