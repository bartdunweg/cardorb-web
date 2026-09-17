import { describe, expect, it } from "vitest";
import { arriveDelay, arriveSteps } from "./arrive-stagger";

describe("the wave a list's tiles arrive in", () => {
    it("staggers the first page one step a tile, up to eight", () => {
        expect([0, 1, 7, 8, 9, 47].map((i) => arriveSteps(i, true))).toEqual([0, 1, 7, 8, 8, 8]);
        expect(arriveDelay(3, true)).toBe("calc(3 * var(--stagger-step))");
        expect(arriveDelay(40, true)).toBe("calc(8 * var(--stagger-step))");
    });

    it("lets an appended batch or a card read again arrive at once", () => {
        expect([0, 3, 48, 200].map((i) => arriveSteps(i, false))).toEqual([0, 0, 0, 0]);
        expect(arriveDelay(60, false)).toBe("0ms");
    });
});
