import { describe, expect, it } from "vitest";
import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import { defaultFinishOf, editionOptions, effectivePatternOf, finishOptions, patternOptions, soleOption } from "./copy-fields";

/** Only the fields these read; the rest of the facts is not this question. */
const facts = (of: Partial<CardFacts>): CardFacts => ({ firstEdition: null, printings: [], editions: null, languages: ["en"], ...of }) as unknown as CardFacts;
const values = (o: { value: string }[]) => o.map((x) => x.value);

/** What the API answers for a promo TCGdex knows as one plain printing. */
const promo = facts({ printings: [{ finish: "normal", foilPattern: null }], editions: ["unlimited"], firstEdition: false });
/** Prismatic Evolutions: the two ball reverses exist, and TCGdex names them. */
const prismatic = facts({
    printings: [
        { finish: "normal", foilPattern: null },
        { finish: "reverse-holo", foilPattern: null },
        { finish: "poke-ball", foilPattern: null },
        { finish: "master-ball", foilPattern: null },
    ],
    editions: ["unlimited"],
    firstEdition: false,
});

describe("finishOptions", () => {
    it("offers a promo the one finish it has", () => {
        expect(values(finishOptions(promo, null))).toEqual(["normal"]);
    });

    it("offers the ball reverses only where the card has them", () => {
        expect(values(finishOptions(prismatic, null))).toEqual(["normal", "reverse-holo", "poke-ball", "master-ball"]);
        const plain = facts({ printings: [{ finish: "reverse-holo", foilPattern: null }] });
        expect(values(finishOptions(plain, null))).toEqual(["reverse-holo"]);
    });

    // Ascended Heroes Erika's Oddish as the API answers it since cardorb-api#454: TCGplayer sells a Poké Ball and an
    // Energy Symbol reverse of it and no plain one.
    it("offers the Energy Symbol reverse where the card has one, and no plain reverse it never had", () => {
        const oddish = facts({
            printings: [
                { finish: "normal", foilPattern: null },
                { finish: "poke-ball", foilPattern: null },
                { finish: "energy-symbol", foilPattern: null },
            ],
        });
        expect(finishOptions(oddish, null)).toEqual([
            { value: "normal", label: "Normal" },
            { value: "poke-ball", label: "Poké Ball reverse" },
            { value: "energy-symbol", label: "Energy Symbol reverse" },
        ]);
    });

    it("offers every finish where the catalogue said nothing, rather than none", () => {
        expect(values(finishOptions(facts({}), null))).toEqual([
            "normal",
            "reverse-holo",
            "holo",
            "poke-ball",
            "master-ball",
            "energy-symbol",
            "friend-ball",
            "love-ball",
            "quick-ball",
            "dusk-ball",
            "team-rocket",
        ]);
    });

    it("keeps a finish already recorded, whatever the catalogue says", () => {
        expect(values(finishOptions(promo, "holo"))).toEqual(["normal", "holo"]);
    });

    it("offers no blank: a copy you own has a finish", () => {
        expect(values(finishOptions(facts({}), null))).not.toContain("");
    });
});

describe("defaultFinishOf", () => {
    it("starts on the only finish a card has", () => {
        const sir = facts({ printings: [{ finish: "holo", foilPattern: null }] });
        expect(defaultFinishOf(finishOptions(sir, null))).toBe("holo");
    });

    it("starts on normal where it is one of several", () => {
        expect(defaultFinishOf(finishOptions(prismatic, null))).toBe("normal");
        expect(defaultFinishOf(finishOptions(facts({}), null))).toBe("normal");
    });

    it("starts on the first where normal is not offered", () => {
        const foils = facts({
            printings: [
                { finish: "reverse-holo", foilPattern: null },
                { finish: "holo", foilPattern: null },
            ],
        });
        expect(defaultFinishOf(finishOptions(foils, null))).toBe("reverse-holo");
    });
});

describe("patternOptions", () => {
    it("asks nothing about the foil of a plain normal", () => {
        expect(patternOptions(promo, "normal", null)).toEqual([]);
    });

    it("offers the pattern the catalogue named for the finish chosen, and no other", () => {
        const card = facts({
            printings: [
                { finish: "holo", foilPattern: "cosmos" },
                { finish: "reverse-holo", foilPattern: null },
            ],
        });
        expect(values(patternOptions(card, "holo", null))).toEqual(["", "cosmos"]);
        // The catalogue names a foil on this card and none on its reverse: that silence is an answer.
        expect(patternOptions(card, "reverse-holo", null)).toEqual([]);
    });

    // Bart, 2026-09-14: a holo whose pattern nothing names is Standard, and nobody is asked.
    it("asks nothing where no source names a pattern for the card", () => {
        const card = facts({ printings: [{ finish: "holo", foilPattern: null }], patternPrints: { standard: true, prints: [] } });
        expect(patternOptions(card, "holo", null)).toEqual([]);
        expect(patternOptions(facts({ patternPrints: null }), "holo", null)).toEqual([]);
        expect(patternOptions(null, "holo", null)).toEqual([]);
    });

    it("asks the catalogue about a plain reverse for a ball reverse", () => {
        const card = facts({
            printings: [
                { finish: "reverse-holo", foilPattern: "cosmos" },
                { finish: "poke-ball", foilPattern: null },
            ],
        });
        expect(values(patternOptions(card, "poke-ball", null))).toEqual(["", "cosmos"]);
    });
});

describe("patternOptions, where a finish is printed with and without a named foil", () => {
    // 151 Machamp: a plain holo, a cosmos holo and a reverse (TCGdex sv03.5-068).
    const machamp151 = facts({
        printings: [
            { finish: "holo", foilPattern: null },
            { finish: "holo", foilPattern: "cosmos" },
            { finish: "reverse-holo", foilPattern: null },
        ],
    });

    it("offers standard beside cosmos, and does not state cosmos as the only answer", () => {
        const offered = patternOptions(machamp151, "holo", null);
        expect(offered.map((o) => o.label)).toEqual(["Standard", "Cosmos"]);
        expect(soleOption(offered)).toBeNull();
    });
});

describe("patternOptions, from the pattern prints TCGplayer sells", () => {
    const print = (finish: "holo" | "reverse-holo", foilPattern: "cosmos" | "cracked-ice", tcgplayerId: number) => ({
        finish,
        foilPattern,
        tcgplayerId,
        price: null,
    });

    // 151 Machamp: TCGdex lists a plain holo, TCGplayer sells the collection box cosmos holo.
    it("offers Standard, selected, and the pattern that exists", () => {
        const card = facts({
            printings: [
                { finish: "holo", foilPattern: null },
                { finish: "reverse-holo", foilPattern: null },
            ],
            patternPrints: { standard: true, prints: [print("holo", "cosmos", 662070)] },
        });
        const offered = patternOptions(card, "holo", null);
        expect(offered).toEqual([
            { label: "Standard", value: "" },
            { label: "Cosmos", value: "cosmos" },
        ]);
        expect(effectivePatternOf(offered, "")).toBe("");
        expect(patternOptions(card, "reverse-holo", null)).toEqual([]);
    });

    // Rowlet of Sun & Moon (sm1-9): a normal and a reverse in its set, a cosmos holo in a blister.
    it("offers the holo a pattern print is, and states the pattern of that holo", () => {
        const card = facts({
            printings: [
                { finish: "normal", foilPattern: null },
                { finish: "reverse-holo", foilPattern: null },
            ],
            patternPrints: { standard: true, prints: [print("holo", "cosmos", 133824)] },
        });
        expect(values(finishOptions(card, null))).toEqual(["normal", "reverse-holo", "holo"]);
        const offered = patternOptions(card, "holo", null);
        expect(soleOption(offered)?.value).toBe("cosmos");
        expect(effectivePatternOf(offered, "")).toBe("cosmos");
        expect(patternOptions(card, "normal", null)).toEqual([]);
    });

    it("offers only the patterns sold for the finish chosen", () => {
        const card = facts({
            patternPrints: { standard: true, prints: [print("holo", "cosmos", 1), print("holo", "cracked-ice", 2), print("reverse-holo", "cosmos", 3)] },
        });
        expect(values(patternOptions(card, "holo", null))).toEqual(["", "cosmos", "cracked-ice"]);
        expect(values(patternOptions(card, "reverse-holo", null))).toEqual(["", "cosmos"]);
    });

    // The Tinkatink promo (svp-025) was only ever the cosmos holo.
    it("states the pattern of a card never sold without it", () => {
        const card = facts({ patternPrints: { standard: false, prints: [print("holo", "cosmos", 499996)] } });
        expect(soleOption(patternOptions(card, "holo", null))?.label).toBe("Cosmos");
    });

    it("keeps a pattern already recorded that no source names", () => {
        const card = facts({ printings: [{ finish: "holo", foilPattern: null }], patternPrints: { standard: true, prints: [] } });
        expect(values(patternOptions(card, "holo", "cracked-ice"))).toEqual(["", "cracked-ice"]);
    });

    it("drops a chosen pattern the new finish does not have", () => {
        const card = facts({
            printings: [
                { finish: "holo", foilPattern: null },
                { finish: "normal", foilPattern: null },
            ],
            patternPrints: { standard: true, prints: [print("holo", "cosmos", 1)] },
        });
        expect(effectivePatternOf(patternOptions(card, "normal", null), "cosmos")).toBe("");
        expect(effectivePatternOf(patternOptions(card, "holo", null), "cosmos")).toBe("cosmos");
    });
});

describe("patternOptions, on a Wizards card", () => {
    const machamp = facts({ printings: [{ finish: "holo", foilPattern: null }], foilPatterns: [] });

    it("asks nothing where the era had one foil for every holo", () => {
        expect(patternOptions(machamp, "holo", null)).toEqual([]);
    });

    it("keeps a pattern somebody recorded anyway", () => {
        expect(values(patternOptions(machamp, "holo", "cosmos"))).toEqual(["", "cosmos"]);
    });
});

describe("editionOptions", () => {
    // Base Set Machamp came stamped and only stamped (cardorb-api#375).
    it("states the one stamped run of a card never printed without the stamp", () => {
        const stamped = facts({ printings: [{ finish: "holo", foilPattern: null }], editions: ["1st-edition"], firstEdition: true });
        expect(soleOption(editionOptions(stamped, null, "en"))?.value).toBe("1st-edition");
        const machamp = facts({ printings: [{ finish: "holo", foilPattern: null }], editions: ["1st-edition", "shadowless"], firstEdition: true });
        expect(values(editionOptions(machamp, null, "en"))).toEqual(["", "1st-edition", "shadowless"]);
    });

    it("asks nothing of a card that had one run", () => {
        expect(editionOptions(promo, null)).toEqual([]);
    });

    it("offers Base Set all three, Shadowless included", () => {
        const base = facts({ editions: ["1st-edition", "shadowless", "unlimited"], firstEdition: true });
        expect(values(editionOptions(base, null))).toEqual(["", "1st-edition", "shadowless", "unlimited"]);
    });

    // My First Battle Pikachu: TCGplayer sells a Blue Border print beside the plain card (cardorb-api#492).
    it("offers Blue Border where the API names it, after Unlimited", () => {
        const pikachu = facts({ editions: ["unlimited", "blue-border"] });
        expect(values(editionOptions(pikachu, null, "en"))).toEqual(["", "unlimited", "blue-border"]);
    });

    it("offers a Jungle card its two runs, and no Shadowless one", () => {
        const jungle = facts({ editions: ["1st-edition", "unlimited"], firstEdition: true });
        expect(values(editionOptions(jungle, null))).toEqual(["", "1st-edition", "unlimited"]);
    });

    it("offers all three where nothing could say, rather than none", () => {
        expect(values(editionOptions(facts({}), null))).toEqual(["", "1st-edition", "shadowless", "unlimited"]);
        expect(values(editionOptions(null, null))).toEqual(["", "1st-edition", "shadowless", "unlimited"]);
    });

    it("reads firstEdition for an API that does not answer the runs yet", () => {
        expect(editionOptions(facts({ firstEdition: false }), null)).toEqual([]);
        expect(values(editionOptions(facts({ firstEdition: true }), null))).toEqual(["", "1st-edition", "shadowless", "unlimited"]);
    });

    it("keeps asking where a run is already recorded, whatever the catalogue says", () => {
        // A select whose value is not among its options shows blank, and saving the form would
        // quietly clear what somebody recorded.
        expect(values(editionOptions(promo, "1st-edition"))).toContain("1st-edition");
    });
});

describe("editionOptions, in the language the copy is", () => {
    const base = facts({ editions: ["1st-edition", "shadowless", "unlimited"], firstEdition: true });

    it("offers Shadowless on an English copy, and on one whose language nobody set", () => {
        expect(values(editionOptions(base, null, "en"))).toContain("shadowless");
        expect(values(editionOptions(base, null, null))).toContain("shadowless");
        expect(values(editionOptions(base, null, ""))).toContain("shadowless");
    });

    it("does not offer it on a German or French copy, which never had that layout", () => {
        expect(values(editionOptions(base, null, "de"))).toEqual(["", "1st-edition", "unlimited"]);
        expect(values(editionOptions(base, null, "fr"))).toEqual(["", "1st-edition", "unlimited"]);
    });

    it("keeps it where somebody recorded it, whatever the language says", () => {
        expect(values(editionOptions(base, "shadowless", "de"))).toContain("shadowless");
    });

    it("leaves the other runs alone", () => {
        expect(values(editionOptions(facts({}), null, "de"))).toEqual(["", "1st-edition", "unlimited"]);
    });
});
