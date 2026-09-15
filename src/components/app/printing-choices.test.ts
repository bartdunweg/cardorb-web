import { describe, expect, it } from "vitest";
import { editionChoices, openingChoice, priceSeriesOf, printingChoices } from "./printing-choices";

const POKE = "https://images.cardorb.com/tcgplayer/566553.jpg";

describe("printingChoices", () => {
    it("offers every printing the card exists in, each with its own picture where it has one", () => {
        expect(
            printingChoices({
                printings: [
                    { finish: "normal", foilPattern: null, image: null },
                    { finish: "poke-ball", foilPattern: null, image: POKE },
                ],
            }),
        ).toEqual([
            { key: "normal", label: "Normal", finish: "normal", foilPattern: null, image: null },
            { key: "poke-ball", label: "Poké Ball", finish: "poke-ball", foilPattern: null, image: POKE },
        ]);
    });

    it("offers nothing for a card printed one way, or with no answer yet", () => {
        expect(printingChoices({ printings: [{ finish: "holo", foilPattern: null }] })).toBeNull();
        expect(printingChoices(null)).toBeNull();
        expect(printingChoices(undefined)).toBeNull();
    });

    it("adds the pattern prints after the printings, once each", () => {
        const choices = printingChoices({
            printings: [{ finish: "holo", foilPattern: null }],
            patternPrints: { prints: [{ finish: "holo", foilPattern: "cosmos", image: POKE }] },
        });
        expect(choices?.map((c) => [c.key, c.label, c.image])).toEqual([
            ["holo", "Holo", null],
            ["holo/cosmos", "Cosmos holo", POKE],
        ]);
    });
});

describe("editionChoices", () => {
    it("offers the runs only where there is more than one", () => {
        expect(editionChoices(["1st-edition", "shadowless", "unlimited"])?.map((e) => e.label)).toEqual(["1st Edition", "Shadowless", "Unlimited"]);
        expect(editionChoices(["unlimited"])).toBeNull();
        expect(editionChoices(null)).toBeNull();
    });
});

describe("openingChoice", () => {
    const choices = [{ key: "normal" }, { key: "holo" }, { key: "reverse-holo" }];

    it("opens on the copy's own printing", () => {
        expect(openingChoice(choices, "reverse-holo")).toBe("reverse-holo");
    });

    it("opens a copy with a pattern the card does not list on its plain finish", () => {
        expect(openingChoice(choices, "holo/cosmos")).toBe("holo");
    });

    it("opens on the first where there is no copy", () => {
        expect(openingChoice(choices, null)).toBe("normal");
        expect(openingChoice(null, "holo")).toBeNull();
    });
});

describe("priceSeriesOf", () => {
    const base = new Set(["1st-edition-holofoil", "shadowless-holofoil", "unlimited-holofoil"]);
    const modern = new Set(["normal", "reverse-holofoil", "poke-ball-reverse-holofoil"]);

    it("reads a run's own series where the card was printed in more than one", () => {
        expect(priceSeriesOf("holo", "1st-edition", base)).toBe("1st-edition-holofoil");
        expect(priceSeriesOf("holo", "shadowless", base)).toBe("shadowless-holofoil");
        expect(priceSeriesOf("holo", "unlimited", base)).toBe("unlimited-holofoil");
    });

    it("reads a finish's own series on a card with one run", () => {
        expect(priceSeriesOf("normal", null, modern)).toBe("normal");
        expect(priceSeriesOf("reverse-holo", null, modern)).toBe("reverse-holofoil");
        expect(priceSeriesOf("poke-ball", null, modern)).toBe("poke-ball-reverse-holofoil");
    });

    // cardorb-api#512: a cosmos or cracked ice print has its own series since 2026-09-15.
    it("reads a foil pattern print's own series, and none where the history has not got it yet", () => {
        const patterned = new Set(["holofoil", "cosmos-holofoil", "cracked-ice-reverse-holofoil"]);
        expect(priceSeriesOf("holo", null, patterned, "cosmos")).toBe("cosmos-holofoil");
        expect(priceSeriesOf("reverse-holo", null, patterned, "cracked-ice")).toBe("cracked-ice-reverse-holofoil");
        expect(priceSeriesOf("holo", null, patterned, "cracked-ice")).toBeNull();
    });

    it("has no series where the history has none", () => {
        expect(priceSeriesOf("master-ball", null, modern)).toBeNull();
        expect(priceSeriesOf("holo", "1st-edition", modern)).toBeNull();
    });
});

describe("openingChoice with a usual one", () => {
    it("opens on the usual run where there is no copy", () => {
        expect(openingChoice([{ key: "1st-edition" }, { key: "unlimited" }], null, "unlimited")).toBe("unlimited");
    });
});
