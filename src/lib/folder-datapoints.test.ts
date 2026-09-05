import { describe, expect, it } from "vitest";
import { datapointsLine, unpricedLine } from "./folder-datapoints";

describe("datapointsLine", () => {
    it("counts cards, or matches when narrowed", () => {
        expect(datapointsLine({ total: 1, narrowed: false })).toBe("1 card");
        expect(datapointsLine({ total: 734, narrowed: false })).toBe("734 cards");
        expect(datapointsLine({ total: 12, narrowed: true })).toBe("12 matches");
        expect(datapointsLine({ total: 1, narrowed: true })).toBe("1 match");
    });
    it("adds the value when there is one and something to value", () => {
        expect(datapointsLine({ total: 3, narrowed: false, value: 2140 })).toMatch(/^3 cards · /);
        expect(datapointsLine({ total: 3, narrowed: false, value: null })).toBe("3 cards");
        expect(datapointsLine({ total: 0, narrowed: false, value: 0 })).toBe("0 cards");
    });
});

describe("unpricedLine", () => {
    it("speaks only when a copy has no price", () => {
        expect(unpricedLine({ total: 3, narrowed: false, unpriced: 0 })).toBeNull();
        expect(unpricedLine({ total: 3, narrowed: false })).toBeNull();
        expect(unpricedLine({ total: 3, narrowed: false, unpriced: 2 })).toBe("2 without a price");
    });
});
