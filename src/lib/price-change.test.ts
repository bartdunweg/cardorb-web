import { describe, expect, it } from "vitest";
import { average30, holdRecoveredDips, priceChange, printingsOfLine, trustedStretch } from "./price-change";

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

    // Base Set Charizard's Shadowless run: €1,869, then €1,000 for eleven days, then €1,948. The line
    // holds that dip, and the arrow beside €1,954.71 read "+25%" against a month that still had it.
    it("averages the month with a dip that came back held at its level, as the line draws it", () => {
        const shadowless = [
            ["2026-08-20", 1869],
            ["2026-08-30", 1869],
            ["2026-08-31", 1000],
            ...Array.from({ length: 10 }, (_, i) => [`2026-09-${String(i + 1).padStart(2, "0")}`, 1000]),
            ["2026-09-11", 1948],
            ["2026-09-12", 1955],
        ].map(([date, v]) => ({ date: date as string, market: null, holo: null, printings: { "shadowless-holofoil": v as number } }));
        const average = average30(shadowless, today, false, "shadowless-holofoil")!;
        expect(average).toBeGreaterThan(1850);
        expect(priceChange(1954.71, average)?.ratio).toBeLessThan(0.06);
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
                    printings: {
                        normal: 0.21,
                        "reverse-holofoil": 0.25,
                        "master-ball-reverse-holofoil": 16.13,
                        "poke-ball-reverse-holofoil": 1.3,
                        "team-rocket-reverse-holofoil": 0.4,
                    },
                },
            ]).map((p) => p.label),
        ).toEqual(["Normal", "Reverse Holo", "Poké Ball Reverse", "Master Ball Reverse", "Team Rocket Reverse"]);
    });
});

describe("trustedStretch", () => {
    const line = (values: number[]) => values.map((value, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, value }));

    // Base Set Charizard's 1st Edition: €400 on weekly readings, €5,000, €430 again, then €3,600 on.
    it("starts a line that contradicts itself after its last jump of five times or more", () => {
        const stretch = trustedStretch(line([400, 5266, 431, 261, 3563, 3524, 8480]));
        expect(stretch.map((p) => p.value)).toEqual([3563, 3524, 8480]);
    });

    it("keeps a line with one such jump whole: a correction or a real move, not a contradiction", () => {
        const whole = line([86, 86, 905, 909]);
        expect(trustedStretch(whole)).toBe(whole);
    });

    it("keeps a line that never jumps that far whole", () => {
        const whole = line([100, 300, 120, 400]);
        expect(trustedStretch(whole)).toBe(whole);
    });

    // A 1st Edition or Shadowless run: the scarce print, where TCGplayer's old weekly readings disagree
    // most. Charizard's 1st Edition at €3,600 through March 2026 and €8,480 from April on.
    it("starts a scarce run's line after its last doubling, given the lower bar", () => {
        const stretch = trustedStretch(line([400, 5266, 3563, 3622, 8480, 8600]), 2);
        expect(stretch.map((p) => p.value)).toEqual([8480, 8600]);
    });
});

describe("holdRecoveredDips", () => {
    const days = (values: [string, number][]) => values.map(([date, value]) => ({ date, value }));

    // Base Set Charizard's Shadowless run: €1,869 on 30 August, €1,000 to €1,099 for eleven days, €1,948 again.
    it("holds the level over a dip of forty percent or more that comes back within three weeks", () => {
        const held = holdRecoveredDips(
            days([
                ["2026-08-30", 1869],
                ["2026-08-31", 1099],
                ["2026-09-05", 1043],
                ["2026-09-10", 1002],
                ["2026-09-11", 1948],
            ]),
        );
        expect(held.map((p) => p.value)).toEqual([1869, 1869, 1869, 1869, 1948]);
    });

    it("holds a spike that falls back the same way", () => {
        const held = holdRecoveredDips(
            days([
                ["2026-01-01", 100],
                ["2026-01-02", 300],
                ["2026-01-03", 102],
            ]),
        );
        expect(held.map((p) => p.value)).toEqual([100, 100, 102]);
    });

    it("keeps a fall that does not come back, or comes back too late, and the line's last days", () => {
        const stays = days([
            ["2026-01-01", 100],
            ["2026-01-02", 50],
            ["2026-01-30", 100],
        ]);
        expect(holdRecoveredDips(stays)).toEqual(stays);
        const open = days([
            ["2026-01-01", 100],
            ["2026-01-02", 50],
        ]);
        expect(holdRecoveredDips(open)).toEqual(open);
    });
});
