import { describe, expect, it } from "vitest";
import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import { finishOptions, patternOptions, soleOption } from "./copy-fields";

type Printing = CardFacts["printings"][number];

const facts = (printings: Printing[]) => ({ printings, languages: ["en"] }) as unknown as CardFacts;

const values = (o: { value: string }[]) => o.map((x) => x.value);

/** A Horsea of Shrouded Fable, as TCGdex lists it. Its cosmos is on the holo and nowhere else. */
const HORSEA: Printing[] = [
    { finish: "normal", foilPattern: null },
    { finish: "holo", foilPattern: "cosmos" },
    { finish: "reverse-holo", foilPattern: null },
];

describe("finishOptions", () => {
    it("offers only the printings the card was made in", () => {
        // Espeon of Dark Explorers: normal and nothing else, whatever an export lists beside it.
        expect(values(finishOptions(facts([{ finish: "normal", foilPattern: null }]), null))).toEqual(["", "normal"]);
    });

    it("offers the patterned reverses only where a reverse exists", () => {
        expect(values(finishOptions(facts(HORSEA), null))).toEqual(["", "normal", "reverse-holo", "holo", "poke-ball", "master-ball"]);
        expect(values(finishOptions(facts([{ finish: "holo", foilPattern: null }]), null))).toEqual(["", "holo"]);
    });

    it("offers everything when the catalogue says nothing", () => {
        expect(values(finishOptions(facts([]), null))).toHaveLength(6);
        expect(values(finishOptions(null, null))).toHaveLength(6);
    });

    it("keeps a finish already recorded, even where the catalogue denies it", () => {
        // A select whose value is not among its options shows blank, and saving the form would
        // then clear an answer somebody gave on purpose.
        expect(values(finishOptions(facts([{ finish: "normal", foilPattern: null }]), "reverse-holo"))).toEqual(["", "normal", "reverse-holo"]);
    });
});

describe("patternOptions", () => {
    it("follows the finish, because a foil belongs to a printing", () => {
        // Horsea's cosmos is on its holo. Beside its normal it was never made.
        expect(values(patternOptions(facts(HORSEA), "holo", null))).toEqual(["", "cosmos"]);
        expect(patternOptions(facts(HORSEA), "normal", null)).toEqual([]);
        expect(patternOptions(facts(HORSEA), "reverse-holo", null)).toEqual([]);
    });

    it("asks about a plain reverse for the patterned ones", () => {
        const pikachu: Printing[] = [
            { finish: "normal", foilPattern: null },
            { finish: "reverse-holo", foilPattern: "cosmos" },
        ];

        expect(values(patternOptions(facts(pikachu), "poke-ball", null))).toEqual(["", "cosmos"]);
    });

    it("is nothing where the card has no patterned printing at all", () => {
        expect(patternOptions(facts([{ finish: "holo", foilPattern: null }]), "holo", null)).toEqual([]);
    });

    it("offers them all where the catalogue has no answer, except beside a plain normal", () => {
        // Empty is "no answer", not "none exist"; most cards carry no foil field yet, and hiding
        // the picker on that basis would stop somebody recording a card they are holding.
        expect(values(patternOptions(facts([]), "holo", null))).toHaveLength(6);
        expect(patternOptions(facts([]), "normal", null)).toEqual([]);
    });

    it("keeps a pattern already recorded, whatever the catalogue says", () => {
        expect(values(patternOptions(facts(HORSEA), "normal", "starlight"))).toEqual(["", "starlight"]);
        expect(values(patternOptions(facts([]), "normal", "cosmos"))).toHaveLength(6);
    });
});

describe("soleOption", () => {
    it("finds the one answer where there is only one", () => {
        // A holo-only card: "not recorded" and "holo" are the same card, so the question
        // invites somebody to leave out something already known.
        expect(soleOption(finishOptions(facts([{ finish: "holo", foilPattern: null }]), null))).toMatchObject({ value: "holo" });
    });

    it("is nothing where there is a real choice, or none at all", () => {
        expect(soleOption(finishOptions(facts(HORSEA), null))).toBeNull();
        expect(soleOption(finishOptions(facts([]), null))).toBeNull();
        expect(soleOption([])).toBeNull();
    });
});
