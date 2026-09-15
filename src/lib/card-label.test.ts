import { describe, expect, it } from "vitest";
import { cardLabel, cardLabelFull, cardLine } from "./card-label";

describe("cardLabel", () => {
    it("is the set's code and the number as printed, the same at every size", () => {
        const card = { set_name: "Destined Rivals", set_abbr: "DRI", number: "230" };
        expect(cardLabel(card)).toBe("DRI 230");
        expect(cardLabel(card)).toBe("DRI 230");
        expect(cardLabel({ set_name: "Base Set", set_abbr: "BS", number: "4" })).toBe("BS 4");
        expect(cardLabel({ set_name: "SVP Black Star Promos", set_abbr: "SVP", number: "85", printed_number: "085" })).toBe("SVP 085");
    });

    it("gives a number that carries its own code that code, with the same space as every label", () => {
        expect(cardLabel({ set_name: "XY Black Star Promos", set_abbr: "XYP", number: "124", printed_number: "XY124" })).toBe("XY 124");
        expect(cardLabel({ set_name: "SWSH Black Star Promos", set_abbr: null, number: "282", printed_number: "SWSH282" })).toBe("SWSH 282");
        expect(cardLabel({ set_name: "Lost Origin", set_abbr: "LOR", number: "TG01", printed_number: "TG01" })).toBe("TG 01");
        expect(cardLabel({ set_name: "Promos", set_abbr: null, number: "SM-P", printed_number: "SM-P" })).toBe("SM-P");
    });

    it("uses Pokémon TCG Online's code where the API gives it, and the name where there is no code at all", () => {
        expect(cardLabel({ set_name: "Wizards Black Star Promos", set_abbr: "PR", number: "13", printed_number: "13" })).toBe("PR 13");
        expect(cardLabel({ set_name: "Jumbo cards", set_abbr: null, number: "5" })).toBe("Jumbo cards 5");
    });

    it("leaves out what it does not have, and never writes a #", () => {
        expect(cardLabel({ set_name: "Destined Rivals", set_abbr: "DRI", number: null })).toBe("DRI");
        expect(cardLabel({ set_name: null, set_abbr: null, number: "12" })).toBe("12");
        expect(cardLabel({})).toBe("");
    });
});

describe("cardLabelFull", () => {
    it("names the set before the printed label", () => {
        expect(cardLabelFull({ set_name: "151", set_abbr: "MEW", number: "199" })).toBe("151 · MEW 199");
        expect(cardLabelFull({ set_name: "XY Black Star Promos", set_abbr: "XYP", number: "124", printed_number: "XY124" })).toBe(
            "XY Black Star Promos · XY 124",
        );
        expect(cardLabelFull({ set_name: "Jumbo cards", set_abbr: null, number: "5" })).toBe("Jumbo cards · 5");
        expect(cardLabelFull({ set_name: null, set_abbr: null, number: null })).toBe("");
    });
});

describe("cardLine", () => {
    it("puts the rarity after the label, and leaves it off where there is none", () => {
        expect(cardLine({ set_abbr: "PFL", number: "004", rarity: "Double Rare" })).toBe("PFL 004 · Double Rare");
        expect(cardLine({ set_abbr: "PFL", number: "004", rarity: null })).toBe("PFL 004");
        expect(cardLine({ set_abbr: "PFL", number: "004", rarity: " " })).toBe("PFL 004");
    });
});
