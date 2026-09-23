import { describe, expect, it } from "vitest";
import { speciesTable } from "./card-group";
import { type CatalogueIndex, catalogueIndexSchema, searchIndex } from "./catalogue-index";

const index: CatalogueIndex = {
    version: "v1",
    sets: {
        "sv03.5": { name: "151", series: "Scarlet & Violet", date: "2023/09/22", image: "https://images.cardorb.com/en/sv/sv03.5" },
        base1: { name: "Base Set", series: "Base", date: "1999/01/09", image: null },
        svp: { name: "SVP Black Star Promos", series: "Scarlet & Violet", date: "2023/06/30", image: null },
    },
    cards: [
        ["sv03.5-006", "sv03.5", "006", "Charizard ex", "Double Rare", ["Fire"]],
        ["sv03.5-099", "sv03.5", "099", "Pecharunt ex", "Double Rare", ["Psychic"]],
        ["sv03.5-007", "sv03.5", "007", "Squirtle", "Common", ["Water"], "https://images.cardorb.com/tcgdex-elsewhere/007"],
        ["base1-4", "base1", "4", "Charizard", "Rare Holo", ["Fire"], null],
        ["base1-58", "base1", "58", "Pikachu", "Common", ["Lightning"]],
        // A card TCGdex has no scan of: the copy holds the second catalogue's whole file.
        ["svp-085", "svp", "085", "Pikachu with Grey Felt Hat", "Promo", ["Lightning"], "https://images.cardorb.com/pokemontcg/svp/85.png"],
        // The same, through the API's cover proxy, which is a path on the API's own origin.
        ["svp-102", "svp", "102", "Mew with Grey Felt Hat", "Promo", ["Psychic"], "/api/cover?url=https%3A%2F%2Flimitless%2FSVP_102.png"],
        // A name with a diacritic: nobody types the accent.
        ["sv03.5-196", "sv03.5", "196", "Poké Ball", "Uncommon", []],
    ],
};

describe("catalogueIndexSchema", () => {
    it("reads what the API sends, with the seventh element optional", () => {
        expect(catalogueIndexSchema.safeParse(index).success).toBe(true);
        expect(catalogueIndexSchema.safeParse({ ...index, cards: [["x"]] }).success).toBe(false);
    });
});

describe("searchIndex", () => {
    /* The API's copy is indexed on the folded text (cardorb-api migration 20260918090000) and this
       document is searched the same way, or a term answers in the browser and not through the API
       the moment the document fails to load. */
    it("does not make anybody type a diacritic", () => {
        expect(searchIndex(index, "poke ball").items.map((c) => c.id)).toEqual(["sv03.5-196"]);
        expect(searchIndex(index, "poké ball").items.map((c) => c.id)).toEqual(["sv03.5-196"]);
    });

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

    it("finds a gold star by the word and a hyphen by a space, as the API does", () => {
        const named: CatalogueIndex = {
            ...index,
            cards: [
                ["ex13-103", "base1", "103", "Mewtwo ☆", "Ultra Rare", ["Psychic"]],
                ["xy6-77", "base1", "77", "Shaymin-EX", "Ultra Rare", ["Colorless"]],
            ],
        };
        expect(searchIndex(named, "mewtwo star").items.map((c) => c.id)).toEqual(["ex13-103"]);
        expect(searchIndex(named, "mewtwo ☆").items.map((c) => c.id)).toEqual(["ex13-103"]);
        expect(searchIndex(named, "shaymin ex").items.map((c) => c.id)).toEqual(["xy6-77"]);
        expect(searchIndex(named, "Shaymin-EX").items.map((c) => c.id)).toEqual(["xy6-77"]);
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
            image: "https://images.cardorb.com/en/sv/sv03.5/006/low.webp",
            // The index is the catalogue alone: nobody has been asked what is held, which is not
            // the same as an empty collection.
            holding: null,
            price: null,
        });
        expect(squirtle?.image).toBe("https://images.cardorb.com/tcgdex-elsewhere/007/low.webp");
        expect(searchIndex(index, "charizard base").items[0]?.image).toBeNull();
    });

    it("draws a whole file as the one size it is, and no picture for an address outside our bucket", () => {
        const pikachu = searchIndex(index, "grey felt hat pikachu").items[0];
        expect(pikachu?.image).toBe("https://images.cardorb.com/pokemontcg/svp/85.png");
        const mew = searchIndex(index, "grey felt hat mew").items[0];
        expect(mew?.image).toBeNull();
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

describe("searchIndex by Pokémon", () => {
    const species = speciesTable([
        { id: 66, name: "Machop" },
        { id: 68, name: "Machamp" },
    ]);
    const shelf: CatalogueIndex = {
        ...index,
        cards: [
            ["a-1", "base1", "1", "Machop", null, []],
            ["a-2", "base1", "2", "Dark Machamp", null, []],
            ["a-3", "base1", "3", "Machamp's Gym", null, []],
            ["a-4", "base1", "4", "Machamp V", null, []],
            ["a-5", "base1", "5", "M Machamp EX", null, []],
        ],
    };

    it("answers every printing of one Pokémon together, under its name, with how many", () => {
        const { items, total } = searchIndex(shelf, "machamp", {}, 1, species);
        expect(total).toBe(4);
        expect(items.map((c) => c.id)).toEqual(["a-2", "a-4", "a-5", "a-3"]);
        expect(items.map((c) => c.group?.title)).toEqual(["Machamp", "Machamp", "Machamp", "Machamp's Gym"]);
        expect(items[0]?.group?.size).toBe(3);
        expect(items[3]?.group).toMatchObject({ key: "name:machampsgym", size: 1 });
    });

    it("keeps the bands between headings, and a heading that is the whole term first", () => {
        expect(searchIndex(shelf, "mach", {}, 1, species).items.map((c) => c.group?.title)).toEqual([
            "Machop",
            "Machamp",
            "Machamp",
            "Machamp",
            "Machamp's Gym",
        ]);
        // "dark" is only in one card's name, and that card brings its heading.
        expect(searchIndex(shelf, "dark", {}, 1, species).items.map((c) => c.id)).toEqual(["a-2"]);
    });

    it("leaves a shelf read by chips alone, and a search without the species, ungrouped", () => {
        expect(searchIndex(shelf, "", { set: "Base Set" }, 1, species).items.every((c) => !c.group)).toBe(true);
        expect(searchIndex(shelf, "machamp").items.every((c) => !c.group)).toBe(true);
    });
});

/* A set's printed code, read as the API reads it (cardorb-api migration 20260918130000), so the
   answer is the same whether the document or the API gives it. */
describe("searchIndex by a set's printed code", () => {
    const shelf: CatalogueIndex = {
        version: "v1",
        sets: {
            sv01: { name: "Scarlet & Violet", series: "Scarlet & Violet", date: "2023/03/31", image: null, code: "SVI" },
            sv02: { name: "Paldea Evolved", series: "Scarlet & Violet", date: "2023/06/09", image: null, code: "PAL" },
            "sv03.5": { name: "151", series: "Scarlet & Violet", date: "2023/09/22", image: null, code: "MEW" },
            sv04: { name: "Paradox Rift", series: "Scarlet & Violet", date: "2023/11/03", image: null, code: "PAR" },
            swsh9: { name: "Brilliant Stars", series: "Sword & Shield", date: "2022/02/25", image: null, code: "BRS" },
            swsh9tg: { name: "Brilliant Stars Trainer Gallery", series: "Sword & Shield", date: "2022/02/25", image: null, code: "BRS" },
            ecard1: { name: "Expedition Base Set", series: "E-Card", date: "2002/09/15", image: null, code: "EX" },
            base1: { name: "Base Set", series: "Base", date: "1999/01/09", image: null, code: "BS" },
            dp1: { name: "Diamond & Pearl", series: "Diamond & Pearl", date: "2007/05/23", image: null, code: "DP" },
            dpp: { name: "DP Black Star Promos", series: "Diamond & Pearl", date: "2007/05/01", image: null },
        },
        // Newest set first, as the document comes.
        cards: [
            ["sv04-123", "sv04", "123", "Palkia", null, []],
            ["sv04-054", "sv04", "054", "Charizard ex", null, []],
            ["sv04-199", "sv04", "199", "Mew ex", null, []],
            ["sv04-091", "sv04", "091", "Absol", null, []],
            ["sv03.5-001", "sv03.5", "001", "Bulbasaur", null, []],
            ["sv03.5-006", "sv03.5", "006", "Charizard ex", null, []],
            ["sv03.5-150", "sv03.5", "150", "Mewtwo", null, []],
            ["sv03.5-151", "sv03.5", "151", "Mew ex", null, []],
            ["sv02-010", "sv02", "010", "Charmander", null, []],
            ["sv02-123", "sv02", "123", "Garganacl", null, []],
            ["sv02-188", "sv02", "188", "Pal Pad", null, []],
            ["sv01-001", "sv01", "001", "Pineco", null, []],
            ["sv01-002", "sv01", "002", "Forretress ex", null, []],
            ["swsh9-018", "swsh9", "018", "Charizard V", null, []],
            ["swsh9tg-TG03", "swsh9tg", "TG03", "Charizard", null, []],
            ["dp1-103", "dp1", "103", "Turtwig", null, []],
            ["dpp-DP16", "dpp", "DP16", "Pikachu", null, []],
            ["ecard1-039", "ecard1", "039", "Charizard", null, []],
            ["base1-4", "base1", "4", "Charizard", null, []],
            ["base1-58", "base1", "58", "Pikachu", null, []],
        ],
    };
    const ids = (term: string) => searchIndex(shelf, term).items.map((c) => c.id);

    it("reads the code the document carries", () => {
        expect(catalogueIndexSchema.safeParse(shelf).success).toBe(true);
    });

    it("narrows to the set beside other words", () => {
        expect(ids("pal 123")).toEqual(["sv02-123"]);
        expect(ids("svi 001")).toEqual(["sv01-001"]);
        expect(ids("mew charizard")).toEqual(["sv03.5-006"]);
        expect(ids("BS charizard")).toEqual(["base1-4"]);
    });

    it("answers both sets that share a code", () => {
        expect(ids("brs charizard")).toEqual(["swsh9-018", "swsh9tg-TG03"]);
        expect(ids("brs")).toEqual(["swsh9-018", "swsh9tg-TG03"]);
    });

    it("reads the word as the name where a card's name holds it whole", () => {
        // As before: Expedition's Charizard is found by its set's name, not narrowed to by the code.
        expect(ids("charizard ex")).toEqual(["sv04-054", "sv03.5-006", "ecard1-039"]);
        expect(ids("mew ex")).toEqual(["sv04-199", "sv03.5-151"]);
        expect(ids("pal pad")).toEqual(["sv02-188"]);
    });

    it("reads the word as text where the set holds no card the other words find", () => {
        // Diamond & Pearl has no Pikachu; the DP16 promo stays the answer.
        expect(ids("dp pikachu")).toEqual(["dpp-DP16"]);
    });

    it("on its own is the set where no name starts with it, and follows the names where one does", () => {
        expect(ids("svi")).toEqual(["sv01-001", "sv01-002"]);
        // Base Set before Absol, which only holds "bs" inside a word.
        expect(ids("bs")).toEqual(["base1-4", "base1-58", "sv04-091"]);
        // Mew ex twice and Mewtwo, then the rest of 151.
        expect(ids("mew")).toEqual(["sv04-199", "sv03.5-150", "sv03.5-151", "sv03.5-001", "sv03.5-006"]);
        // Palkia and Pal Pad, then Paldea Evolved's other cards.
        expect(ids("pal")).toEqual(["sv04-123", "sv02-188", "sv02-010", "sv02-123"]);
    });
});
