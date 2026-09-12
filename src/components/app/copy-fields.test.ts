import { describe, expect, it } from "vitest";
import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import { editionOptions, finishOptions, patternOptions } from "./copy-fields";

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
        expect(values(finishOptions(promo, null))).toEqual(["", "normal"]);
    });

    it("offers the ball reverses only where the card has them", () => {
        expect(values(finishOptions(prismatic, null))).toEqual(["", "normal", "reverse-holo", "poke-ball", "master-ball"]);
        const plain = facts({ printings: [{ finish: "reverse-holo", foilPattern: null }] });
        expect(values(finishOptions(plain, null))).toEqual(["", "reverse-holo"]);
    });

    it("offers every finish where the catalogue said nothing, rather than none", () => {
        expect(values(finishOptions(facts({}), null))).toEqual(["", "normal", "reverse-holo", "holo", "poke-ball", "master-ball"]);
    });

    it("keeps a finish already recorded, whatever the catalogue says", () => {
        expect(values(finishOptions(promo, "holo"))).toEqual(["", "normal", "holo"]);
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

    it("offers every pattern for a card whose printings are known and whose foils are not named", () => {
        // TCGdex names a foil on a fraction of the cards it knows the printings of. Reading that
        // silence as "no pattern" would take the question away from somebody holding a cracked
        // ice reverse and looking at it.
        const card = facts({ printings: [{ finish: "reverse-holo", foilPattern: null }] });
        expect(values(patternOptions(card, "reverse-holo", null))).toEqual(["", "cosmos", "cracked-ice", "starlight", "confetti", "vertical-line"]);
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

describe("editionOptions", () => {
    it("asks nothing of a card that had one run", () => {
        expect(editionOptions(promo, null)).toEqual([]);
    });

    it("offers Base Set all three, Shadowless included", () => {
        const base = facts({ editions: ["1st-edition", "shadowless", "unlimited"], firstEdition: true });
        expect(values(editionOptions(base, null))).toEqual(["", "1st-edition", "shadowless", "unlimited"]);
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
