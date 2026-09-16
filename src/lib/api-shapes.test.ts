import { describe, expect, it } from "vitest";
import {
    type CatalogueSet,
    apiPriceSchema,
    browseCardSchema,
    cardFactsAnswer,
    cardFromItem,
    cardFromPokemonCard,
    cardItemSchema,
    folderFromApi,
    ownImage,
    pokemonCardFromBrowse,
    pokemonCardFromSetCard,
    priceForCopy,
    publicCardFromItem,
    removedCardSchema,
    seriesFromSets,
    setCardFromBrowse,
} from "./api-shapes";

describe("ownImage", () => {
    it("keeps a file of our own bucket and answers null for any other address", () => {
        expect(ownImage("https://images.cardorb.com/en/base/base1/4/low.webp")).toBe("https://images.cardorb.com/en/base/base1/4/low.webp");
        expect(ownImage("/api/cover?url=x")).toBeNull();
        expect(ownImage("https://assets.tcgdex.net/a.png")).toBeNull();
        expect(ownImage(null)).toBeNull();
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
            image: "https://images.cardorb.com/p.png",
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
            price: { market: 4 },
        });
        expect(card).toMatchObject({
            price: 4,
            set_name: "Base Set",
            set: "base1",
            types: ["Lightning"],
            is_favorite: true,
            owned: false,
            wishlist: true,
            collection_id: "f",
            image_url: "https://images.cardorb.com/p.png",
        });
    });

    it("carries the printing's own picture beside the card's scan, and only a file of ours", () => {
        const item = cardItemSchema.parse({
            id: "row",
            name: "Charizard",
            number: "4",
            set: "base1",
            setTitle: "Base Set",
            setAbbr: "BS",
            rarity: null,
            gen: null,
            type: null,
            image: "https://images.cardorb.com/en/base/base1/4/low.webp",
            imageHigh: null,
            printImage: "https://images.cardorb.com/tcgplayer/42382.jpg",
            speciesId: 6,
            tcgId: "base1-4",
            owned: true,
            finish: "holo",
            foilPattern: null,
            edition: "unlimited",
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
        });
        expect(cardFromItem(item)).toMatchObject({
            image_url: "https://images.cardorb.com/en/base/base1/4/low.webp",
            print_image_url: "https://images.cardorb.com/tcgplayer/42382.jpg",
        });
        expect(cardFromItem({ ...item, printImage: "https://tcgplayer-cdn.tcgplayer.com/product/42382_in_1000x1000.jpg" }).print_image_url).toBeNull();
        expect(cardFromItem({ ...item, printImage: undefined }).print_image_url).toBeNull();
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
        };
        expect(cardFromItem({ ...item, dexFace: true }).dex_face).toBe(true);
        expect(cardFromItem(item).dex_face).toBe(false);
    });
});

describe("priceForCopy", () => {
    const price = { market: 4 };

    it("shows the market figure, and nothing where there is none", () => {
        expect(priceForCopy({ price })).toBe(4);
        expect(priceForCopy({ price: { market: null } })).toBeNull();
        expect(priceForCopy({ price: null })).toBeNull();
    });

    it("prices a 1st Edition copy as the stamped run, and falls back where there is none", () => {
        const stamped = { low: 30, market: 40, avg30: null, nm: null };
        expect(priceForCopy({ edition: "1st-edition", price, priceFirstEd: stamped })).toBe(40);
        // Nobody prices a stamped run for most cards: the ordinary price stands.
        expect(priceForCopy({ edition: "1st-edition", price })).toBe(4);
        // And an unlimited copy never reads it, even where there is one.
        expect(priceForCopy({ edition: "unlimited", price, priceFirstEd: stamped })).toBe(4);
    });

    it("reads the printing the API chose before any figure of the card's own", () => {
        const printing = { low: 27.99, market: 53.23, avg30: null, nm: null };
        // A Jungle Scyther holo: TCGplayer prices the holo and the plain rare apart, and the API
        // works out which printing this copy is and sends that figure.
        expect(priceForCopy({ price, printingPrice: printing })).toBe(53.23);
        expect(priceForCopy({ price, printingPrice: null })).toBe(4);
    });

    it("leaves a reverse without its own printing's figure unpriced, never at the card's own", () => {
        const reverse = { low: 0.2, market: 0.29, avg30: null, nm: null };
        expect(priceForCopy({ finish: "reverse-holo", price, printingPrice: reverse })).toBe(0.29);
        // Skyridge Gengar: TCGplayer prices the normal card only, so its reverse has no price.
        expect(priceForCopy({ finish: "reverse-holo", price, printingPrice: null })).toBeNull();
        expect(priceForCopy({ finish: "poke-ball", price })).toBeNull();
        expect(priceForCopy({ finish: "reverse-holo", edition: "1st-edition", price, priceFirstEd: price })).toBeNull();
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
            image: "https://images.cardorb.com/x.png",
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
        expect(card.image_url).toBe("https://images.cardorb.com/x.png");
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
            price: { market: 2.46 },
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

    it("draws no logo for an address outside our bucket", () => {
        const { series } = seriesFromSets([set({ logo: "https://assets.tcgdex.net/en/base/base1/logo.png" })]);
        expect(series[0].sets[0].logoUrl).toBeNull();
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
                image: "https://images.cardorb.com/p.png",
                imageHigh: null,
                rarity: "Common",
                types: ["Grass"],
                series: "Scarlet & Violet",
                owned: true,
                wishlist: false,
                quantity: 2,
                itemIds: ["row"],
                price: null,
                tcgId: null,
            }),
        ).toEqual({
            id: "sv1-1",
            number: "1",
            name: "Sprigatito",
            localName: null,
            setName: "Scarlet & Violet",
            setAbbr: null,
            rarity: "Common",
            category: null,
            trainerType: null,
            types: ["Grass"],
            imageUrl: "https://images.cardorb.com/p.png",
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
            tcgId: "SV4a-001",
        };
        expect(setCardFromBrowse({ ...base, localName: "ナゾノクサ" })).toMatchObject({ name: "Oddish", localName: "ナゾノクサ" });
        expect(setCardFromBrowse(browseCardSchema.parse(base)).localName).toBeNull();
    });
});

describe("setCardFromBrowse, the API's full-art flag", () => {
    it("keeps the flag where the answer sent one, and leaves it out where it did not", () => {
        const base = {
            id: "swsh7-177",
            number: "177",
            name: "Jolteon V",
            setName: "Evolving Skies",
            image: null,
            imageHigh: null,
            rarity: "Ultra Rare",
            types: ["Lightning"],
            series: "Sword & Shield",
            owned: false,
            wishlist: false,
            quantity: 0,
            itemIds: [],
            price: null,
            tcgId: "swsh7-177",
        };
        expect(setCardFromBrowse(browseCardSchema.parse({ ...base, fullArt: true })).fullArt).toBe(true);
        expect(setCardFromBrowse(browseCardSchema.parse({ ...base, fullArt: false })).fullArt).toBe(false);
        expect(setCardFromBrowse(browseCardSchema.parse(base))).not.toHaveProperty("fullArt");
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
            setAbbr: null,
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

describe("apiPriceSchema", () => {
    // The API sent the lowest listing, Cardmarket's average and the Near Mint band until
    // 2026-09-14. An answer from before the API drops them still parses, and keeps only the market.
    it("reads an answer that still carries the dropped fields", () => {
        expect(apiPriceSchema.parse({ low: 1, market: 4, avg30: 5, nm: null })).toEqual({ market: 4 });
    });
});

describe("cardFactsAnswer patternPrints", () => {
    const base = { rarity: null, illustrator: null, hp: null, stage: null, evolveFrom: null, regulationMark: null, price: null };

    it("reads the pattern prints TCGplayer sells, and drops a pattern this app has no word for", () => {
        const facts = cardFactsAnswer.parse({
            ...base,
            patternPrints: {
                standard: true,
                prints: [
                    { foilPattern: "cosmos", finish: "holo", tcgplayerId: 662070, price: { market: 1.2 } },
                    { foilPattern: "water-web", finish: "holo", tcgplayerId: 1, price: null },
                ],
            },
        });
        expect(facts.patternPrints).toEqual({
            standard: true,
            prints: [{ foilPattern: "cosmos", finish: "holo", tcgplayerId: 662070, price: { market: 1.2 } }],
        });
    });

    it("is no answer from an API that does not send it", () => {
        expect(cardFactsAnswer.parse(base).patternPrints).toBeUndefined();
    });
});
