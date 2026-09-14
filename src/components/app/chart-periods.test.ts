import { afterEach, describe, expect, it, vi } from "vitest";
import { byWeek, forChart } from "./chart-periods";

/*
 * Max draws one reading a week (Bart, 2026-09-14): the archive keeps six months of days and a week
 * each before, and the chart spaces readings a step each, so a mix drew the last six months wider
 * than the years before. A week is Sunday to Saturday, its point on the Saturday.
 */
describe("byWeek", () => {
    afterEach(() => vi.useRealTimers());

    it("keeps the last reading of each week, dated on its Saturday", () => {
        vi.useFakeTimers({ now: new Date("2026-09-14T12:00:00Z"), toFake: ["Date"] });
        const weeks = byWeek([
            // Sun 8 Jun 2025 to Sat 14 Jun: a Tuesday reading and the Saturday's.
            { date: "2025-06-10", value: 1 },
            { date: "2025-06-14", value: 2 },
            // The next week has only a Tuesday: it still sits on its Saturday, the 21st.
            { date: "2025-06-17", value: 3 },
        ]);
        expect(weeks).toEqual([
            { date: "2025-06-14", value: 2, weekFrom: "2025-06-08" },
            { date: "2025-06-21", value: 3, weekFrom: "2025-06-15" },
        ]);
    });

    it("ends the week still running on its last reading, not on a Saturday to come", () => {
        vi.useFakeTimers({ now: new Date("2026-09-14T12:00:00Z"), toFake: ["Date"] });
        const weeks = byWeek([
            { date: "2026-09-13", value: 1 },
            { date: "2026-09-14", value: 2 },
        ]);
        expect(weeks).toEqual([{ date: "2026-09-14", value: 2, weekFrom: "2026-09-13" }]);
    });

    it("sums the cards added during a week onto the reading that stands for it", () => {
        vi.useFakeTimers({ now: new Date("2026-09-14T12:00:00Z"), toFake: ["Date"] });
        const [week] = byWeek([
            { date: "2026-08-17", value: 10, added: 2, addedValue: 5 },
            { date: "2026-08-19", value: 12, added: 0, addedValue: 0 },
            { date: "2026-08-22", value: 20, added: 3, addedValue: 8 },
        ]);
        expect(week).toMatchObject({ date: "2026-08-22", value: 20, added: 5, addedValue: 13 });
    });
});

describe("forChart", () => {
    afterEach(() => vi.useRealTimers());

    it("draws every day up to six months and a week a step for Max", () => {
        vi.useFakeTimers({ now: new Date("2026-09-14T12:00:00Z"), toFake: ["Date"] });
        const days = ["2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", "2026-09-12"].map((date, i) => ({ date, value: i }));
        expect(forChart(days, "7d")).toHaveLength(5);
        expect(forChart(days, "6m")).toHaveLength(5);
        expect(forChart(days, "max")).toEqual([{ date: "2026-09-12", value: 4, weekFrom: "2026-09-06" }]);
    });
});
