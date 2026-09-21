import { afterEach, describe, expect, it, vi } from "vitest";
import { byWeek, changeSaid, forChart, isoDaysAgo } from "./chart-periods";

/*
 * Max draws one reading a week (Bart, 2026-09-14): the archive keeps six months of days and a week
 * each before, and the chart spaces readings a step each, so a mix drew the last six months wider
 * than the years before. A week is Sunday to Saturday, its point on the Saturday.
 */
describe("byWeek", () => {
    afterEach(() => vi.useRealTimers());

    it("averages each week's readings, dated on its Saturday", () => {
        vi.useFakeTimers({ now: new Date("2026-09-14T12:00:00Z"), toFake: ["Date"] });
        const weeks = byWeek([
            // Sun 8 Jun 2025 to Sat 14 Jun: a Tuesday reading and the Saturday's.
            { date: "2025-06-10", value: 1 },
            { date: "2025-06-14", value: 2 },
            // The next week has only a Tuesday: it still sits on its Saturday, the 21st.
            { date: "2025-06-17", value: 3 },
        ]);
        expect(weeks).toEqual([
            { date: "2025-06-14", value: 1.5, weekFrom: "2025-06-08" },
            { date: "2025-06-21", value: 3, weekFrom: "2025-06-15" },
        ]);
    });

    it("ends the week still running on its last reading, not on a Saturday to come", () => {
        vi.useFakeTimers({ now: new Date("2026-09-14T12:00:00Z"), toFake: ["Date"] });
        const weeks = byWeek([
            { date: "2026-09-13", value: 1 },
            { date: "2026-09-14", value: 2 },
        ]);
        expect(weeks).toEqual([{ date: "2026-09-14", value: 1.5, weekFrom: "2026-09-13" }]);
    });

    it("sums the cards added during a week onto the reading that stands for it", () => {
        vi.useFakeTimers({ now: new Date("2026-09-14T12:00:00Z"), toFake: ["Date"] });
        const [week] = byWeek([
            { date: "2026-08-17", value: 10, added: 2, addedValue: 5 },
            { date: "2026-08-19", value: 12, added: 0, addedValue: 0 },
            { date: "2026-08-22", value: 20, added: 3, addedValue: 8 },
        ]);
        expect(week).toMatchObject({ date: "2026-08-22", value: 14, added: 5, addedValue: 13 });
    });

    // Pitch Black Grubbin's first week: presale at €0.43 and €0.26, €0.03 by the Saturday.
    it("lets a card's first expensive days count in its first week", () => {
        vi.useFakeTimers({ now: new Date("2026-09-14T12:00:00Z"), toFake: ["Date"] });
        const [week] = byWeek([0.43, 0.26, 0.26, 0.26, 0.1, 0.03].map((value, i) => ({ date: `2026-07-${String(13 + i)}`, value })));
        expect(week).toMatchObject({ date: "2026-07-18", weekFrom: "2026-07-12", value: 0.22 });
    });
});

describe("forChart", () => {
    afterEach(() => vi.useRealTimers());

    it("draws every day up to six months and a week a step for Max", () => {
        vi.useFakeTimers({ now: new Date("2026-09-14T12:00:00Z"), toFake: ["Date"] });
        const days = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12"].map((date, i) => ({ date, value: i }));
        expect(forChart(days, "7d")).toHaveLength(5);
        expect(forChart(days, "6m")).toHaveLength(5);
        expect(forChart(days, "max")).toEqual([{ date: "2026-09-12", value: 2, weekFrom: "2026-09-06" }]);
    });
});

/*
 * Bart, 2026-09-21: an account whose first reading is twelve days old read "+EUR 7,967 in the last
 * 30 days" over its figure. The figure is right and the sentence was not: 1M can only measure what
 * the readings cover, so where they do not fill the period it says which stretch it is.
 */
describe("changeSaid", () => {
    afterEach(() => vi.useRealTimers());
    const hold = () => vi.useFakeTimers({ now: new Date("2026-09-21T12:00:00"), toFake: ["Date"] });
    const from = (first: string) => [{ date: first }, { date: "2026-09-21" }];

    it("names the first reading where the history is shorter than the period", () => {
        hold();
        // Twelve days of readings, a month asked for.
        expect(changeSaid("1m", from("2026-09-09"))).toBe("since the first reading");
        expect(changeSaid("7d", from("2026-09-20"))).toBe("since the first reading");
        expect(changeSaid("6m", from("2026-09-09"))).toBe("since the first reading");
    });

    it("names the period where the readings fill it", () => {
        hold();
        expect(changeSaid("1m", from(isoDaysAgo(30)))).toBe("in the last 30 days");
        expect(changeSaid("1m", from(isoDaysAgo(400)))).toBe("in the last 30 days");
        expect(changeSaid("7d", from(isoDaysAgo(7)))).toBe("in the last 7 days");
        expect(changeSaid("3m", from(isoDaysAgo(91)))).toBe("in the last 3 months");
        expect(changeSaid("6m", from(isoDaysAgo(182)))).toBe("in the last 6 months");
    });

    /*
     * The whole line decides, not the period's slice of it: a copy counts from the day it was
     * acquired, which the owner sets by hand, so a collection can reach back to 2023 while one
     * nightly reading is missing on the period's own first day. That gap is not a young account.
     */
    it("reads the line itself, so a gap on the period's first day is not a short history", () => {
        hold();
        const yearsBack = [{ date: "2023-07-15" }, { date: isoDaysAgo(29) }, { date: "2026-09-21" }];
        expect(changeSaid("1m", yearsBack)).toBe("in the last 30 days");
        expect(changeSaid("6m", yearsBack)).toBe("in the last 6 months");
        expect(changeSaid("7d", yearsBack)).toBe("in the last 7 days");
    });

    it("leaves Max as it was, which already says it, and answers with no readings at all", () => {
        hold();
        expect(changeSaid("max", from("2026-09-09"))).toBe("since the first reading");
        expect(changeSaid("max", [])).toBe("since the first reading");
        expect(changeSaid("1m", [])).toBe("in the last 30 days");
    });
});
