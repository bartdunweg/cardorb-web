import { describe, expect, it } from "vitest";
import { heldAreaPath, heldGapPath, linePath, nearestIndex, niceTicks, pointsFor, splitAtGaps } from "./value-chart-math";

const frame = { width: 100, height: 60, top: 10, right: 0, bottom: 10, left: 0 };

describe("niceTicks", () => {
    it("steps in round numbers from below the lowest reading to above the highest", () => {
        expect(niceTicks(880, 1003)).toEqual([850, 900, 950, 1000, 1050]);
        expect(niceTicks(0, 937)).toEqual([0, 250, 500, 750, 1000]);
        expect(niceTicks(12, 40)).toEqual([10, 20, 30, 40]);
    });

    it("still draws an axis when every reading is the same", () => {
        expect(niceTicks(500, 500)).toEqual([500, 501]);
    });
});

describe("pointsFor", () => {
    it("spreads readings across the width and scales value from a zero baseline", () => {
        const points = pointsFor([0, 50, 100], frame, 0, 100);
        expect(points.map((p) => p.x)).toEqual([0, 50, 100]);
        expect(points.map((p) => p.y)).toEqual([50, 30, 10]);
    });

    it("centres a lone reading", () => {
        expect(pointsFor([5], frame, 0, 10)[0].x).toBe(50);
    });
});

describe("paths", () => {
    it("draws straight segments and closes the area to the baseline", () => {
        const points = pointsFor([0, 100], frame, 0, 100);
        expect(linePath(points)).toBe("M0.0 50.0 L100.0 10.0");
        expect(heldAreaPath([points], [], 50)).toBe("M0.0 50.0 L100.0 10.0 L100.0 50.0 L0.0 50.0 Z");
    });
});

describe("nearestIndex", () => {
    it("picks the reading closest to the pointer", () => {
        const points = pointsFor([1, 2, 3], frame, 0, 3);
        expect(nearestIndex(points, 30)).toBe(1);
        expect(nearestIndex(points, 90)).toBe(2);
    });

    it("draws three or more points as a smooth curve that stays within the readings", () => {
        const points = [
            { x: 0, y: 50, index: 0 },
            { x: 100, y: 10, index: 1 },
            { x: 200, y: 50, index: 2 },
        ];
        const d = linePath(points);
        expect(d.startsWith("M0.0 50.0 C")).toBe(true);
        expect(d.endsWith("200.0 50.0")).toBe(true);
        // The peak is a reading: the tangent there is flat, so the control points sit at its height.
        expect(d).toContain("66.7 10.0 100.0 10.0");
        expect(d).toContain("C133.3 10.0");
    });
});

describe("readings placed by time", () => {
    it("spaces readings by the days between them when the days are given", () => {
        const points = pointsFor([1, 2, 3], frame, 0, 3, ["2026-01-01", "2026-01-02", "2026-01-11"]);
        expect(points.map((p) => p.x)).toEqual([0, 10, 100]);
    });
});

describe("splitAtGaps", () => {
    // Bart, 2026-09-14: a stretch with no readings shows as a dotted line to the next reading.
    it("splits the line where more than a week has no reading", () => {
        const days = ["2025-06-07", "2025-06-14", "2025-06-21", "2025-07-19", "2025-07-26"];
        const points = pointsFor([1, 2, 3, 4, 5], frame, 0, 5, days);
        const { runs, gaps } = splitAtGaps(points, days);
        expect(runs.map((r) => r.map((p) => p.index))).toEqual([
            [0, 1, 2],
            [3, 4],
        ]);
        expect(gaps.map(([a, b]) => [a.index, b.index])).toEqual([[2, 3]]);
    });

    // Bart, 2026-09-15: a stretch with no readings holds the last price and steps at the next one,
    // rather than a slope that draws a jump as a gradual climb.
    it("draws a gap flat at the last reading and steps at the next", () => {
        const days = ["2026-01-01", "2026-01-02", "2026-01-11"];
        const points = pointsFor([0, 0, 4], frame, 0, 4, days);
        const { runs, gaps } = splitAtGaps(points, days);
        expect(heldGapPath(gaps[0])).toBe("M10.0 50.0 H100.0 V10.0");
        expect(heldAreaPath(runs, gaps, 50)).toBe("M0.0 50.0 L10.0 50.0 H100.0 V10.0 L100.0 50.0 L0.0 50.0 Z");
    });

    it("keeps a week apart, and a day apart, as one line", () => {
        const days = ["2026-09-05", "2026-09-12", "2026-09-13"];
        const { runs, gaps } = splitAtGaps(pointsFor([1, 2, 3], frame, 0, 3, days), days);
        expect(runs).toHaveLength(1);
        expect(gaps).toHaveLength(0);
    });
});
