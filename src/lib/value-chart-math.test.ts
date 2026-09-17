import { describe, expect, it } from "vitest";
import { areaPath, fullRange, linePath, nearestIndex, pointsFor, thinReadings } from "./value-chart-math";

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

describe("thinReadings", () => {
    const day = (d: number) => Date.UTC(2026, 0, d);
    const times = (n: number) => Array.from({ length: n }, (_, i) => day(i + 1));

    // Bart, 2026-09-17: 09-13 fell 29 and the softened line rose 25 there.
    it("draws the readings themselves, so a day that fell goes down", () => {
        const values = [40172, 40182, 40153, 40302];
        const [yMin, yMax] = fullRange(Math.min(...values), Math.max(...values));
        const points = pointsFor(values, frame, yMin, yMax);
        const drawn = thinReadings(times(4), values, 40).map((i) => points[i]);
        expect(drawn.map((p) => p.index)).toEqual([0, 1, 2, 3]);
        // Down on the screen is a larger y.
        expect(drawn[2].y).toBeGreaterThan(drawn[1].y);
        expect(drawn[0].y).toBeGreaterThan(drawn[1].y);
        expect(drawn[3].y).toBeLessThan(drawn[2].y);
    });

    it("keeps every reading while there are no more than asked", () => {
        expect(thinReadings(times(12), Array(12).fill(1), 12)).toHaveLength(12);
        expect(thinReadings([day(1), day(2)], [5, 7], 12)).toEqual([0, 1]);
    });

    it("thins by keeping the first, the last, and each span's lowest and highest, in time order", () => {
        const values = Array.from({ length: 180 }, (_, i) => 100 + (i % 7));
        values[90] = 40; // a dip one day long
        values[140] = 400; // a peak one day long
        const t = times(180);
        const target = 22;
        const kept = thinReadings(t, values, target);
        expect(kept[0]).toBe(0);
        expect(kept.at(-1)).toBe(179);
        expect(kept.includes(90) && kept.includes(140)).toBe(true);
        expect(kept.length).toBeLessThanOrEqual(target);
        expect(kept.every((k, i) => i === 0 || k > kept[i - 1])).toBe(true);
        // Every kept reading is a real one, and each span's lowest and highest are among them.
        const spans = Math.floor((target - 2) / 2);
        const width = (t[179] - t[0]) / spans;
        for (let k = 0; k < spans; k++) {
            const inSpan = t.map((_, i) => i).filter((i) => i > 0 && i < 179 && Math.min(spans - 1, Math.floor((t[i] - t[0]) / width)) === k);
            const lo = Math.min(...inSpan.map((i) => values[i]));
            const hi = Math.max(...inSpan.map((i) => values[i]));
            const keptInSpan = kept.filter((i) => inSpan.includes(i)).map((i) => values[i]);
            expect(keptInSpan).toContain(lo);
            expect(keptInSpan).toContain(hi);
        }
    });

    it("does not start rising before a step", () => {
        const values = [10, 10, 10, 10, 12];
        const points = pointsFor(values, frame, ...fullRange(10, 12));
        const drawn = thinReadings(times(5), values, 40).map((i) => points[i]);
        const flat = points[0].y;
        const d = linePath(drawn);
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
