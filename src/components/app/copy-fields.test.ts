import { describe, expect, it } from "vitest";
import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import { finishOptions, hasFoil } from "./copy-fields";

const facts = (variants: { normal: boolean; holo: boolean; reverse: boolean }): CardFacts => ({ variants, languages: ["en"] }) as CardFacts;

const values = (o: { value: string }[]) => o.map((x) => x.value);

describe("finishOptions", () => {
    it("offers only the printings the card was made in", () => {
        // Espeon of Dark Explorers: normal and nothing else, whatever an export
        // may list beside it.
        expect(values(finishOptions(facts({ normal: true, holo: false, reverse: false }), null))).toEqual(["", "normal"]);
    });

    it("offers the patterned reverses only where a reverse exists", () => {
        // TCGdex does not name the ball prints, so the honest test is the one
        // they share: no reverse, no patterned reverse.
        expect(values(finishOptions(facts({ normal: true, holo: false, reverse: true }), null))).toEqual([
            "",
            "normal",
            "reverse-holo",
            "poke-ball",
            "master-ball",
        ]);
        expect(values(finishOptions(facts({ normal: false, holo: true, reverse: false }), null))).toEqual(["", "holo"]);
    });

    it("offers everything when the catalogue says nothing", () => {
        expect(values(finishOptions(null, null))).toHaveLength(6);
    });

    it("keeps a finish already recorded, even where the catalogue denies it", () => {
        // A select whose value is not among its options shows blank, and saving
        // the form would then clear an answer somebody gave on purpose.
        expect(values(finishOptions(facts({ normal: true, holo: false, reverse: false }), "reverse-holo"))).toEqual(["", "normal", "reverse-holo"]);
    });
});

describe("hasFoil", () => {
    it("is false only for a card with no foil at all", () => {
        expect(hasFoil(facts({ normal: true, holo: false, reverse: false }), null)).toBe(false);
        expect(hasFoil(facts({ normal: true, holo: false, reverse: true }), null)).toBe(true);
        expect(hasFoil(facts({ normal: false, holo: true, reverse: false }), null)).toBe(true);
    });

    it("stays true where something is already recorded, or nothing is known", () => {
        expect(hasFoil(facts({ normal: true, holo: false, reverse: false }), "cosmos")).toBe(true);
        expect(hasFoil(null, null)).toBe(true);
    });
});
