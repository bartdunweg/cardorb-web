import { describe, expect, it } from "vitest";
import { isoDaysAgo } from "./chart-periods";
import { chartLine, periodChange, printingsOfLine, trustedStretch } from "./price-change";

/*
 * A day this many days back, since the periods are counted from today, written the way the periods
 * are cut: `isoDaysAgo` is the local calendar day, and toISOString is UTC, which is a day earlier
 * between midnight and two in Amsterdam. A test with a reading on the window's own edge failed in
 * any zone ahead of UTC while the ones with a twenty-day margin passed (review of #771).
 */
const daysAgo = (days: number) => isoDaysAgo(days);
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
        const change = periodChange(line, "1m", false, "normal");
        expect(change?.direction).toBe("up");
        expect(change?.text).toBe("+€0.40 · 20%");
        expect(change?.label).toBe("Up €0.40, 20 percent, in the last 30 days");
    });

    it("leaves out what is older than the window, so a shorter period reads a smaller move", () => {
        const line = [day(40, 1), day(20, 2), day(1, 2.4)];
        expect(periodChange(line, "6m", false, "normal")?.text).toBe("+€1.40 · 140%");
        expect(periodChange(line, "max", false, "normal")?.text).toBe("+€1.40 · 140%");
    });

    // Max draws one reading a week, the week's average (chart-periods.ts), so its figure starts there
    // too: a card whose first week slid from €0.43 to €0.37 used to read the first day while the
    // line began at the week's mean.
    it("under Max, starts where the weekly line starts: the first week's average", () => {
        const at = (date: string, value: number) => ({ date, market: null, holo: null, printings: { normal: value } });
        const line = [at("2025-06-09", 0.43), at("2025-06-11", 0.4), at("2025-06-13", 0.37), at("2025-06-16", 0.5)];
        const change = periodChange(line, "max", false, "normal");
        expect(change?.direction).toBe("up");
        expect(change?.amount).toBeCloseTo(0.5 - 0.4, 2);
    });

    /* The words a screen reader hears come from the line, not the button: a printing first priced
       last week said "in the last 6 months" over a move that was seven days old (Bart, 2026-09-21).
       The same rule Home's figure follows, so the two never say different things about one period. */
    it("names the first reading where the line does not reach back as far as the period", () => {
        const young = [day(6, 1), day(1, 1.5)];
        expect(periodChange(young, "6m", false, "normal")?.label).toBe("Up €0.50, 50 percent, since the first reading");
        // Six days of readings do not fill a seven-day window either, so 7D says the same thing.
        expect(periodChange(young, "7d", false, "normal")?.label).toBe("Up €0.50, 50 percent, since the first reading");
        const old = [day(200, 1), day(20, 1.4), day(7, 1), day(1, 1.5)];
        expect(periodChange(old, "6m", false, "normal")?.label).toBe("Up €0.10, 7 percent, in the last 6 months");
        expect(periodChange(old, "7d", false, "normal")?.label).toBe("Up €0.50, 50 percent, in the last 7 days");
    });

    it("says how far down, with a proper minus", () => {
        const change = periodChange([day(20, 2.4), day(1, 2.28)], "1m", false, "normal");
        expect(change?.direction).toBe("down");
        expect(change?.text).toBe("−€0.12 · 5%");
    });

    // ex8-15: a holo copy at €22.51 read "+648%" against a stray plain series at €3.
    it("reads the copy's own printing, and nothing in its place", () => {
        const line = [
            { date: daysAgo(20), market: 3, holo: null, printings: { normal: 3, holofoil: 20 } },
            { date: daysAgo(1), market: 3, holo: null, printings: { normal: 3, holofoil: 22 } },
        ];
        expect(periodChange(line, "1m", false, "holofoil")?.text).toBe("+€2.00 · 10%");
        expect(periodChange(line, "1m", false, "normal")).toBeNull();
        expect(periodChange(line, "1m", false, "reverse-holofoil")).toBeNull();
    });

    it("shows nothing under half a percent, under a cent, or without two figures in the window", () => {
        expect(periodChange([day(20, 100), day(1, 100.3)], "1m", false, "normal")).toBeNull();
        expect(periodChange([day(20, 0.5), day(1, 0.505)], "1m", false, "normal")).toBeNull();
        expect(periodChange([day(1, 2.4)], "1m", false, "normal")).toBeNull();
        expect(periodChange([day(200, 1), day(150, 5)], "1m", false, "normal")).toBeNull();
        expect(periodChange([], "1m", false, "normal")).toBeNull();
    });

    // Base Set Charizard's Shadowless run: €1,869, then €1,000 for eleven days, then €1,948. The
    // figure reads the window's first figure against its last, so a dip in between does not move it.
    // Holding the dip on the drawn line is the API's work since cardorb-api#589.
    it("reads first against last, whatever the line does in between", () => {
        const shadowless = [
            day(30, 1869, "shadowless-holofoil"),
            day(20, 1869, "shadowless-holofoil"),
            ...Array.from({ length: 11 }, (_, i) => day(19 - i, 1000, "shadowless-holofoil")),
            day(2, 1948, "shadowless-holofoil"),
            day(1, 1955, "shadowless-holofoil"),
        ];
        expect(periodChange(shadowless, "1m", false, "shadowless-holofoil")?.ratio).toBeLessThan(0.06);
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
