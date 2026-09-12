import { describe, expect, it } from "vitest";
import {
    type CatalogueSet,
    absoluteImage,
    browseCardSchema,
    cardFromItem,
    cardFromPokemonCard,
    folderFromApi,
    pokemonCardFromBrowse,
    pokemonCardFromSetCard,
    priceForCopy,
    publicCardFromItem,
    seriesFromSets,
    setCardFromBrowse,
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
            setAbbr: "BS",
            rarity: "Common",
            gen: "Gen 1",
            type: "Lightning",
            image: "/api/cover?url=p",
            imageHigh: null,
            speciesId: 25,
            tcgId: "base1-58",
            owned: false,
            finish: null,
            foilPattern: null,
            quantity: 1,
            condition: null,
            grade: null,
            language: null,
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
            set: "base1",
            types: ["Lightning"],
            is_favorite: true,
            owned: false,
            wishlist: true,
            collection_id: "f",
            image_url: "https://api.cardorb.com/api/cover?url=p",
        });
    });

    it("reads which card leads its Pokédex slot, and says false where an older API is silent", () => {
        const item = {
            id: "row",
            name: "Pikachu",
            number: "58",
            set: "base1",
            setTitle: "Base Set",
            setAbbr: null,
            rarity: null,
            gen: null,
            type: null,
            image: null,
            imageHigh: null,
            speciesId: 25,
            tcgId: null,
            owned: true,
            finish: null,
            foilPattern: null,
            quantity: 1,
            condition: null,
            grade: null,
            language: null,
            purchasePrice: null,
            purchaseDate: null,
            notes: null,
            isFavorite: false,
            acquiredAt: null,
            collectionId: null,
            price: null,
            priceHolo: null,
        };
        expect(cardFromItem({ ...item, dexFace: true }).dex_face).toBe(true);
        expect(cardFromItem(item).dex_face).toBe(false);
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

    it("prices a 1st Edition copy as the stamped run, and falls back where there is none", () => {
        const price = { low: 1, market: 4, avg30: 4, nm: { low: 5, mid: 6, high: 7 } };
        const stamped = { low: 30, market: 40, avg30: 40, nm: null };
        // The stamped run wins over both the plain and the foil series, whatever the finish.
        expect(priceForCopy({ finish: "holo", edition: "1st-edition", price, priceHolo: null, priceFirstEd: stamped })).toBe(40);
        expect(priceForCopy({ finish: "reverse-holo", edition: "1st-edition", price, priceHolo: price, priceFirstEd: stamped })).toBe(40);
        // Nobody prices a stamped run for most cards: the ordinary price stands.
        expect(priceForCopy({ finish: null, edition: "1st-edition", price, priceHolo: null })).toBe(6);
        // And an unlimited copy never reads it, even where there is one.
        expect(priceForCopy({ finish: null, edition: "unlimited", price, priceHolo: null, priceFirstEd: stamped })).toBe(6);
    });

    it("prices a reverse holo with the foil price, everything else with the plain one, as the API does", () => {
        expect(priceForCopy({ finish: "reverse-holo", price, priceHolo: holo })).toBe(60);
        expect(priceForCopy({ finish: "poke-ball", price, priceHolo: holo })).toBe(60);
        expect(priceForCopy({ finish: "master-ball", price, priceHolo: holo })).toBe(60);
        expect(priceForCopy({ finish: "holo", price, priceHolo: holo })).toBe(6);
        expect(priceForCopy({ finish: "normal", price, priceHolo: holo })).toBe(6);
        expect(priceForCopy({ finish: "reverse-holo", price, priceHolo: null })).toBe(6);
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
            imageHigh: null,
            speciesId: 25,
            tcgId: "base1-58",
            copies: 3,
        });
        expect(card).toMatchObject({
            id: "Base Set-58",
            set_name: "Base Set",
            quantity: 3,
            types: ["Lightning"],
            finish: null,
            tcg_id: "base1-58",
        });
        expect(card.image_url).toMatch(/^https:\/\/.*\/api\/cover\?url=x$/);
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
            price: null,
            priceHolo: null,
            tcgId: null,
        });
        expect(c).toMatchObject({ set: "Scarlet & Violet", types: null, hp: null, owned: true, price: null });
        expect(c).not.toHaveProperty("language");
    });
    it("carries the catalogue id and the price with every hit, for the sheet a hit opens", () => {
        const c = pokemonCardFromBrowse({
            id: "me05-085",
            number: "085",
            name: "Fomantis",
            setName: "Pitch Black",
            image: null,
            imageHigh: null,
            rarity: null,
            types: [],
            series: "Mega Evolution",
            owned: false,
            wishlist: false,
            quantity: 0,
            itemIds: [],
            price: { low: 1.5, market: 2.46, avg30: 2.96, nm: null },
            priceHolo: null,
            tcgId: "me05-085",
        });
        expect(c).toMatchObject({ tcgId: "me05-085", price: 2.46 });
        expect(c).not.toHaveProperty("language");
    });
    it("carries the catalogue and the id for a hit from another language, which is how the API finds it", () => {
        const hit = {
            id: "SV2a-006",
            number: "006",
            name: "リザードンex",
            setName: "Pokémon Card 151",
            image: null,
            imageHigh: null,
            rarity: null,
            types: [],
            series: "SV",
            owned: false,
            wishlist: false,
            quantity: 0,
            itemIds: [],
            price: null,
            priceHolo: null,
            tcgId: "SV2a-006",
        };
        expect(pokemonCardFromBrowse(hit, "ja")).toMatchObject({ tcgId: "SV2a-006", language: "ja" });
        expect(pokemonCardFromBrowse(hit, "en")).not.toHaveProperty("language");
    });
});

describe("cardFromPokemonCard", () => {
    it("reads a hit as a card nobody holds: the price line's id and the number, and nothing about a copy", () => {
        const card = cardFromPokemonCard({
            id: "me05-085",
            name: "Fomantis",
            set: "Pitch Black",
            number: "085",
            rarity: null,
            image: "https://img/me05/085",
            supertype: null,
            subtypes: null,
            hp: null,
            types: ["Grass"],
            artist: null,
            series: "Mega Evolution",
            releaseDate: null,
            setPrintedTotal: null,
            flavorText: null,
            nationalPokedexNumbers: null,
            tcgId: "me05-085",
            owned: false,
            wishlist: false,
            quantity: 0,
            price: 2.46,
        });
        expect(card).toMatchObject({ tcg_id: "me05-085", price: 2.46, set_name: "Pitch Black", owned: false, wishlist: false, quantity: 0 });
        expect(card).toMatchObject({ finish: null, purchase_price: null, collection_id: null, notes: null });
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
        localName: null,
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

    it("passes the owned count through and calls a full set complete", () => {
        const { series } = seriesFromSets([set({ id: "a", total: 10, ownedCount: 10 }), set({ id: "b", total: 10, ownedCount: 9 })]);
        expect(series[0].sets[0]).toMatchObject({ owned: 10, total: 10, complete: true });
        expect(series[0].sets[1]).toMatchObject({ owned: 9, complete: false });
    });

    it("counts complete and started sets", () => {
        const { complete, started, totalSets } = seriesFromSets([
            set({ id: "a", total: 10, ownedCount: 10 }),
            set({ id: "b", total: 10, ownedCount: 3 }),
            set({ id: "c", total: 10, ownedCount: 0 }),
        ]);
        expect({ complete, started, totalSets }).toEqual({ complete: 1, started: 2, totalSets: 3 });
    });

    it("reads whether the catalogue has the set's cards, and assumes so from an API that does not say", () => {
        // TCGdex lists 68 of 184 Japanese sets with a count and no card; an API before
        // cardorb-api#265 never said, and its every set had cards as far as the shelf knew.
        const { series } = seriesFromSets([set({ id: "a", cardsRecorded: false }), set({ id: "b", cardsRecorded: true }), set({ id: "c" })]);
        expect(series[0].sets.map((s) => s.cardsRecorded)).toEqual([false, true, true]);
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
                price: null,
                priceHolo: null,
                tcgId: null,
            }),
        ).toEqual({
            id: "sv1-1",
            number: "1",
            name: "Sprigatito",
            localName: null,
            setName: "Scarlet & Violet",
            rarity: "Common",
            category: null,
            trainerType: null,
            types: ["Grass"],
            imageUrl: "https://api.cardorb.com/p.png",
            imageHighUrl: null,
            owned: true,
            wishlist: false,
            quantity: 2,
            itemIds: ["row"],
            price: null,
            tcgId: null,
        });
    });
});

describe("setCardFromBrowse, a card off another shelf", () => {
    it("keeps the printed name beside the English one, and reads an older API's silence as none", () => {
        const base = {
            id: "SV4a-001",
            number: "001",
            name: "Oddish",
            setName: "Shiny Treasure ex",
            image: null,
            imageHigh: null,
            rarity: null,
            types: [],
            series: "Scarlet & Violet",
            owned: false,
            wishlist: false,
            quantity: 0,
            itemIds: [],
            price: null,
            priceHolo: null,
            tcgId: "SV4a-001",
        };
        expect(setCardFromBrowse({ ...base, localName: "ナゾノクサ" })).toMatchObject({ name: "Oddish", localName: "ナゾノクサ" });
        expect(setCardFromBrowse(browseCardSchema.parse(base)).localName).toBeNull();
    });
});

describe("pokemonCardFromSetCard", () => {
    it("carries what the add action validates: name, set, number, rarity, types", () => {
        const card = pokemonCardFromSetCard({
            id: "sv1-1",
            number: "1",
            name: "Sprigatito",
            localName: null,
            setName: "Scarlet & Violet",
            rarity: null,
            category: null,
            trainerType: null,
            types: [],
            imageUrl: null,
            imageHighUrl: null,
            owned: false,
            wishlist: false,
            quantity: 0,
            itemIds: [],
            price: null,
            tcgId: null,
        });
        expect(card).toMatchObject({ id: "sv1-1", name: "Sprigatito", set: "Scarlet & Violet", number: "1", rarity: null, types: null, owned: false });
    });
});

describe("folderFromApi", () => {
    it("reads a folder from an API that knows no rules as one filled by hand", () => {
        expect(folderFromApi({ id: "f", name: "Kanto", createdAt: "2026-09-05", count: 3 })).toMatchObject({ kind: "manual", rule: null });
    });
    it("keeps a rule and its kind", () => {
        const rule = { dex: { from: 1, to: 151 } };
        expect(folderFromApi({ id: "f", name: "Kanto", createdAt: "2026-09-05", count: 3, rule })).toMatchObject({ kind: "rule", rule });
    });
});
