import { describe, expect, it } from "vitest";
import { areaPath, fullRange, linePath, nearestIndex, pointsFor } from "./value-chart-math";

const frame = { width: 100, height: 60, top: 10, right: 0, bottom: 10, left: 0 };

describe("fullRange", () => {
    // Bart, 2026-09-15: a week that rose starts low and ends high, however little it moved.
    it("spans exactly the lowest to the highest reading", () => {
        expect(fullRange(40100, 40180)).toEqual([40100, 40180]);
    });

    it("centres a flat line", () => {
        expect(fullRange(500, 500)).toEqual([495, 505]);
        expect(fullRange(0, 0)).toEqual([-1, 1]);
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

describe("the line through every reading", () => {
    // Bart, 2026-09-17: 09-13 fell 29 and the softened line rose 25 there.
    it("draws a day that fell as falling", () => {
        const values = [40172, 40182, 40153, 40302];
        const [yMin, yMax] = fullRange(Math.min(...values), Math.max(...values));
        const points = pointsFor(values, frame, yMin, yMax);
        // Down on the screen is a larger y.
        expect(points[2].y).toBeGreaterThan(points[1].y);
        expect(points[0].y).toBeGreaterThan(points[1].y);
        expect(points[3].y).toBeLessThan(points[2].y);
        // The path ends each segment on the reading itself, so the dot sits on the line.
        const ends = linePath(points)
            .split(" C")
            .slice(1)
            .map((seg) => seg.split(" ").slice(-2).map(Number));
        expect(ends).toEqual(points.slice(1).map((p) => [Number(p.x.toFixed(1)), Number(p.y.toFixed(1))]));
    });

    it("does not start rising before a step", () => {
        const values = [10, 10, 10, 10, 12];
        const points = pointsFor(values, frame, ...fullRange(10, 12));
        const flat = points[0].y;
        const d = linePath(points);
        // Every coordinate up to the last reading before the step sits at the flat height.
        const segments = d.split(" C").slice(1);
        for (const seg of segments.slice(0, 3)) {
            const ys = seg
                .split(" ")
                .filter((_, i) => i % 2 === 1)
                .map(Number);
            expect(ys.every((y) => y === Number(flat.toFixed(1)))).toBe(true);
        }
        // The segment into the step leaves the flat height flat.
        expect(Number(segments[3].split(" ")[1])).toBe(Number(flat.toFixed(1)));
    });
});
