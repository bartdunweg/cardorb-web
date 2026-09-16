import { describe, expect, it } from "vitest";
import { chartLine, holdRecoveredDips, periodChange, printingsOfLine, trustedStretch } from "./price-change";

/** A day this many days back, since the periods are counted from today. */
const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
};
/** One day of a line, one printing, as the API answers it. */
const day = (back: number, value: number, printing = "normal") => ({
    date: daysAgo(back),
    market: null,
    holo: null,
    printings: { [printing]: value },
});

describe("periodChange", () => {
    // The question Home's Biggest movers answers, so a card opened from that list shows the move
    // that put it there rather than its price against a month's average (Bart, 2026-09-16).
    it("reads the first figure in the window against the last, and names the period", () => {
        const line = [day(40, 1), day(20, 2), day(1, 2.4)];
        const change = periodChange(line, "1m", false, "normal", "in the last 30 days");
        expect(change?.direction).toBe("up");
        expect(change?.text).toBe("+€0.40 · 20%");
        expect(change?.label).toBe("Up €0.40, 20 percent, in the last 30 days");
    });

    it("leaves out what is older than the window, so a shorter period reads a smaller move", () => {
        const line = [day(40, 1), day(20, 2), day(1, 2.4)];
        expect(periodChange(line, "6m", false, "normal", "in the last 6 months")?.text).toBe("+€1.40 · 140%");
        expect(periodChange(line, "max", false, "normal", "since the first reading")?.text).toBe("+€1.40 · 140%");
    });

    // Max draws one reading a week, the week's average (chart-periods.ts), so its figure starts there
    // too: a card whose first week slid from €0.43 to €0.37 used to read the first day while the
    // line began at the week's mean.
    it("under Max, starts where the weekly line starts: the first week's average", () => {
        const at = (date: string, value: number) => ({ date, market: null, holo: null, printings: { normal: value } });
        const line = [at("2025-06-09", 0.43), at("2025-06-11", 0.4), at("2025-06-13", 0.37), at("2025-06-16", 0.5)];
        const change = periodChange(line, "max", false, "normal", "since the first reading");
        expect(change?.direction).toBe("up");
        expect(change?.amount).toBeCloseTo(0.5 - 0.4, 2);
    });

    it("says how far down, with a proper minus", () => {
        const change = periodChange([day(20, 2.4), day(1, 2.28)], "1m", false, "normal", "in the last 30 days");
        expect(change?.direction).toBe("down");
        expect(change?.text).toBe("−€0.12 · 5%");
    });

    // ex8-15: a holo copy at €22.51 read "+648%" against a stray plain series at €3.
    it("reads the copy's own printing, and nothing in its place", () => {
        const line = [
            { date: daysAgo(20), market: 3, holo: null, printings: { normal: 3, holofoil: 20 } },
            { date: daysAgo(1), market: 3, holo: null, printings: { normal: 3, holofoil: 22 } },
        ];
        expect(periodChange(line, "1m", false, "holofoil", "in the last 30 days")?.text).toBe("+€2.00 · 10%");
        expect(periodChange(line, "1m", false, "normal", "in the last 30 days")).toBeNull();
        expect(periodChange(line, "1m", false, "reverse-holofoil", "in the last 30 days")).toBeNull();
    });

    it("shows nothing under half a percent, under a cent, or without two figures in the window", () => {
        expect(periodChange([day(20, 100), day(1, 100.3)], "1m", false, "normal", "in the last 30 days")).toBeNull();
        expect(periodChange([day(20, 0.5), day(1, 0.505)], "1m", false, "normal", "in the last 30 days")).toBeNull();
        expect(periodChange([day(1, 2.4)], "1m", false, "normal", "in the last 30 days")).toBeNull();
        expect(periodChange([day(200, 1), day(150, 5)], "1m", false, "normal", "in the last 30 days")).toBeNull();
        expect(periodChange([], "1m", false, "normal", "in the last 30 days")).toBeNull();
    });

    // Base Set Charizard's Shadowless run: €1,869, then €1,000 for eleven days, then €1,948. The line
    // holds that dip, so the figure beside the price says what the drawn line says.
    it("reads the line the chart draws, dip held and all", () => {
        const shadowless = [
            day(30, 1869, "shadowless-holofoil"),
            day(20, 1869, "shadowless-holofoil"),
            ...Array.from({ length: 11 }, (_, i) => day(19 - i, 1000, "shadowless-holofoil")),
            day(2, 1948, "shadowless-holofoil"),
            day(1, 1955, "shadowless-holofoil"),
        ];
        expect(periodChange(shadowless, "1m", false, "shadowless-holofoil", "in the last 30 days")?.ratio).toBeLessThan(0.06);
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

describe("chartLine", () => {
    const points = (key: string, values: number[]) =>
        values.map((v, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, market: null, holo: null, printings: { [key]: v } }));
    const figures = [400, 5266, 3563, 3622, 8480, 8600];

    it("starts a scarce run's line after its last doubling", () => {
        expect(chartLine(points("1st-edition-holofoil", figures), "1st-edition-holofoil", false).map((p) => p.value)).toEqual([8480, 8600]);
    });

    it("keeps any other printing's line whole under the same figures, where only one jump is five times", () => {
        expect(chartLine(points("holofoil", figures), "holofoil", false).map((p) => p.value)).toEqual(figures);
    });
});
