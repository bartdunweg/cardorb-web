import { describe, expect, it } from "vitest";
import { areaPath, linePath, nearestIndex, niceTicks, pointsFor, smoothLine, yAt } from "./value-chart-math";

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

describe("smoothLine", () => {
    const day = (d: number) => Date.UTC(2026, 0, d);

    // Bart, 2026-09-15: "een mooie lijn", flowing, and the ends where the readings are.
    it("keeps the first and the last reading exactly", () => {
        const values = [10, 14, 9, 15, 8, 16, 12];
        const line = smoothLine(
            values.map((_, i) => day(i + 1)),
            values,
            40,
        );
        expect(line[0]).toEqual({ t: day(1), v: 10 });
        expect(line.at(-1)).toEqual({ t: day(7), v: 12 });
    });

    it("softens a zigzag between the ends", () => {
        const values = [10, 20, 10, 20, 10, 20, 10];
        const line = smoothLine(
            values.map((_, i) => day(i + 1)),
            values,
            40,
        );
        const inner = line.slice(1, -1).map((p) => p.v);
        expect(Math.max(...inner) - Math.min(...inner)).toBeLessThan(10);
    });

    it("takes many readings down to about the number asked, by time", () => {
        const values = Array.from({ length: 180 }, (_, i) => 100 + (i % 7));
        const line = smoothLine(
            values.map((_, i) => day(i + 1)),
            values,
            40,
        );
        expect(line.length).toBeLessThanOrEqual(42);
        expect(line.length).toBeGreaterThan(30);
        expect(line.every((p, i) => i === 0 || p.t > line[i - 1].t)).toBe(true);
    });

    it("draws two readings as they are", () => {
        expect(smoothLine([day(1), day(2)], [5, 7], 40)).toEqual([
            { t: day(1), v: 5 },
            { t: day(2), v: 7 },
        ]);
    });
});

describe("yAt", () => {
    it("reads the line's height between its points", () => {
        const pts = [
            { x: 0, y: 10, index: 0 },
            { x: 100, y: 50, index: 1 },
        ];
        expect(yAt(pts, 25)).toBe(20);
        expect(yAt(pts, -5)).toBe(10);
        expect(yAt(pts, 200)).toBe(50);
    });
});
