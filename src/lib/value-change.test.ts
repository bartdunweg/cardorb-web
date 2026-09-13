import { describe, expect, it } from "vitest";
import { splitChange } from "./value-change";

describe("splitChange", () => {
    const at = (date: string, value: number, addedValue = 0) => ({ date, value, cards: 1, priced: 1, unpriced: 0, added: addedValue ? 1 : 0, addedValue });

    it("splits a period's change into cards added and prices, leaving the first reading's additions out", () => {
        const shown = [at("2026-09-01", 1000, 500), at("2026-09-05", 1300, 200), at("2026-09-10", 1250)];
        expect(splitChange(shown, 1250)).toEqual({ change: 250, added: 200, prices: 50 });
    });

    it("reads a line without the fields as all prices", () => {
        expect(splitChange([{ date: "2026-09-01", value: 10, cards: 1, priced: 1, unpriced: 0 }], 12)).toEqual({ change: 2, added: 0, prices: 2 });
    });

    it("has nothing to split without a reading", () => {
        expect(splitChange([], 12)).toBeNull();
    });
});
