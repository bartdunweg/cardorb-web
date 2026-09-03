import { describe, expect, it } from "vitest";
import { areaPath, linePath, nearestIndex, niceTicks, pointsFor } from "./value-chart-math";

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
        expect(areaPath(points, 50)).toBe("M0.0 50.0 L100.0 10.0 L100.0 50.0 L0.0 50.0 Z");
    });
});

describe("nearestIndex", () => {
    it("picks the reading closest to the pointer", () => {
        const points = pointsFor([1, 2, 3], frame, 0, 3);
        expect(nearestIndex(points, 30)).toBe(1);
        expect(nearestIndex(points, 90)).toBe(2);
    });
});
