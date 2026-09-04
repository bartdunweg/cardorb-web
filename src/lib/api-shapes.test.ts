import { describe, expect, it } from "vitest";
import {
    type CatalogueSet,
    absoluteImage,
    cardFromItem,
    pokemonCardFromBrowse,
    priceForCopy,
    publicCardFromItem,
    seriesFromSets,
    setCardFromBrowse,
    slotsFromEntries,
} from "./api-shapes";

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

describe("seriesFromSets", () => {
    const set = (over: Partial<CatalogueSet>): CatalogueSet => ({
        id: "x",
        name: "Set",
        series: "Scarlet & Violet",
        releaseDate: "2024/01/01",
        total: 100,
        printedTotal: 90,
        logo: null,
        symbol: null,
        ownedCount: 0,
        wishlistCount: 0,
        ...over,
    });

    it("groups sets by series in the order the API gives them", () => {
        const { series } = seriesFromSets([
            set({ id: "sv2", series: "Scarlet & Violet" }),
            set({ id: "swsh1", series: "Sword & Shield" }),
            set({ id: "sv1", series: "Scarlet & Violet" }),
        ]);
        expect(series.map((s) => s.name)).toEqual(["Scarlet & Violet", "Sword & Shield"]);
        expect(series[0].sets.map((s) => s.id)).toEqual(["sv2", "sv1"]);
    });

    it("caps the owned count at the set's size, since the API counts copies", () => {
        const { series } = seriesFromSets([set({ id: "a", total: 10, ownedCount: 14 })]);
        expect(series[0].sets[0]).toMatchObject({ owned: 10, total: 10, complete: true });
    });

    it("counts complete and started sets", () => {
        const { complete, started, totalSets } = seriesFromSets([
            set({ id: "a", total: 10, ownedCount: 10 }),
            set({ id: "b", total: 10, ownedCount: 3 }),
            set({ id: "c", total: 10, ownedCount: 0 }),
        ]);
        expect({ complete, started, totalSets }).toEqual({ complete: 1, started: 2, totalSets: 3 });
    });

    it("resolves a relative logo on the API's host", () => {
        const { series } = seriesFromSets([set({ logo: "/api/cover?url=l" })]);
        expect(series[0].sets[0].logoUrl).toBe("https://api.cardorb.com/api/cover?url=l");
    });
});

describe("setCardFromBrowse", () => {
    it("keeps the number, the picture and how many are held", () => {
        expect(
            setCardFromBrowse({
                id: "sv1-1",
                number: "1",
                name: "Sprigatito",
                setName: "Scarlet & Violet",
                image: "/p.png",
                imageHigh: null,
                rarity: "Common",
                types: ["Grass"],
                series: "Scarlet & Violet",
                owned: true,
                wishlist: false,
                quantity: 2,
                itemIds: ["row"],
            }),
        ).toEqual({ id: "sv1-1", number: "1", name: "Sprigatito", imageUrl: "https://api.cardorb.com/p.png", owned: true, wishlist: false, quantity: 2 });
    });
});
