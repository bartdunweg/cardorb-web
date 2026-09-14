import { describe, expect, it } from "vitest";
import { average30, priceChange, printingsOfLine } from "./price-change";

describe("priceChange", () => {
    it("says how far above the 30-day average the price sits, with the sign in the words", () => {
        const change = priceChange(2.52, 2.4);
        expect(change?.direction).toBe("up");
        expect(change?.text).toBe("+€0.12 · 5%");
        expect(change?.label).toBe("Up €0.12, 5 percent, against the 30-day average");
    });

    it("says how far below, with a proper minus", () => {
        const change = priceChange(2.28, 2.4);
        expect(change?.direction).toBe("down");
        expect(change?.text).toBe("−€0.12 · 5%");
        expect(change?.label).toBe("Down €0.12, 5 percent, against the 30-day average");
    });

    it("shows nothing under half a percent, under a cent, or when a figure is missing", () => {
        expect(priceChange(100.3, 100)).toBeNull(); // 0.3%
        expect(priceChange(0.505, 0.5)).toBeNull(); // 1%, but half a cent
        expect(priceChange(2.4, 2.4)).toBeNull();
        expect(priceChange(null, 2.4)).toBeNull();
        expect(priceChange(2.4, null)).toBeNull();
        expect(priceChange(2.4, 0)).toBeNull();
    });

    it("keeps a change that just clears both thresholds", () => {
        expect(priceChange(100.5, 100)?.text).toBe("+€0.50 · 1%");
    });
});

describe("average30", () => {
    const today = "2026-09-12";
    const points = [
        { date: "2026-08-01", market: 100, holo: 900 },
        { date: "2026-08-20", market: 10, holo: 30 },
        { date: "2026-09-05", market: 12, holo: null },
        { date: "2026-09-11", market: null, holo: 40 },
    ];

    // The card's own line, which is TCGplayer's since cardorb-api#355, rather than an average from
    // another market: the arrow beside a TCGplayer price used to read Cardmarket's month.
    it("averages the plain series over the last thirty days, leaving out older points and gaps", () => {
        expect(average30(points, today, false)).toBe(11);
    });

    // A day the foil has no figure is left out, never read at the plain price (cardorb-api#443).
    it("reads the foil series for a reverse copy, and only the foil", () => {
        expect(average30(points, today, true)).toBeCloseTo((30 + 40) / 2);
    });

    // ex8-15: a holo copy at €22.51 read "+648%" against a stray plain series at €3.
    it("reads the copy's own printing where it is known", () => {
        const lines = [
            { date: "2026-09-10", market: 3, holo: null, printings: { normal: 3, holofoil: 22 } },
            { date: "2026-09-12", market: 3, holo: null, printings: { normal: 3, holofoil: 23 } },
        ];
        expect(average30(lines, today, false, "holofoil")).toBeCloseTo(22.5);
        expect(average30(lines, today, false, "reverse-holofoil")).toBeNull();
    });

    it("is nothing without a point in the window", () => {
        expect(average30([{ date: "2026-07-01", market: 5, holo: null }], today, false)).toBeNull();
        expect(average30([], today, false)).toBeNull();
    });
});

describe("printingsOfLine", () => {
    it("names the printings a card has readings for, in reading order", () => {
        expect(
            printingsOfLine([
                { date: "2026-09-01", market: 1, holo: null, printings: { "reverse-holofoil": 2, normal: 1 } },
                { date: "2026-09-02", market: 1, holo: null, printings: { "1st-edition-holofoil": 9, "shadowless-holofoil": 5 } },
            ]).map((p) => p.label),
        ).toEqual(["Normal", "Reverse Holo", "1st Edition Holo", "Shadowless Holo"]);
    });

    it("names a patterned reverse's own line after its finish, beside the plain reverse", () => {
        expect(
            printingsOfLine([
                {
                    date: "2026-09-14",
                    market: 0.25,
                    holo: 0.25,
                    printings: { normal: 0.21, "reverse-holofoil": 0.25, "master-ball-reverse-holofoil": 16.13, "poke-ball-reverse-holofoil": 1.3 },
                },
            ]).map((p) => p.label),
        ).toEqual(["Normal", "Reverse Holo", "Poké Ball Reverse", "Master Ball Reverse"]);
    });
});
