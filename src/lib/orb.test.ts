import { describe, expect, it } from "vitest";
import { ORB_STILL_TIME, orbFrame, orbTuning } from "./orb";

/*
 * The orb is drawn from one list of dots, by the canvas and by the SVG mark alike. At 64 px it has
 * to be the package's own 64 px orb, and at any size it has to stay inside its square and paint
 * the far side first, or the near dots vanish behind it.
 */

describe("orb", () => {
    it("tunes 64 px to the original's 64 px preset", () => {
        expect(orbTuning(64)).toEqual({ around: 44, sphere: 38, thin: 0.85 });
    });

    it("keeps the original's count from 300 px up", () => {
        expect(orbTuning(300)).toEqual({ around: 88, sphere: 150, thin: 1 });
        expect(orbTuning(600)).toMatchObject({ around: 88, sphere: 150 });
    });

    it.each([32, 64, 220, 1024])("stays inside a %i px square", (size) => {
        const dots = orbFrame(size, ORB_STILL_TIME);
        expect(dots.length).toBeGreaterThan(50);
        for (const { x, y, r, opacity } of dots) {
            expect(x - r).toBeGreaterThanOrEqual(0);
            expect(y - r).toBeGreaterThanOrEqual(0);
            expect(x + r).toBeLessThanOrEqual(size);
            expect(y + r).toBeLessThanOrEqual(size);
            expect(opacity).toBeGreaterThan(0);
            expect(opacity).toBeLessThanOrEqual(1);
        }
    });

    it("paints the far side first, so the near dots are the ones you see", () => {
        const dots = orbFrame(220, ORB_STILL_TIME);
        const back = dots.slice(0, 20);
        const front = dots.slice(-20);
        const mean = (list: typeof dots, key: "r" | "opacity") => list.reduce((sum, dot) => sum + dot[key], 0) / list.length;
        expect(mean(front, "r")).toBeGreaterThan(mean(back, "r"));
        expect(mean(front, "opacity")).toBeGreaterThan(mean(back, "opacity"));
    });

    it("draws the same frame every time for the same moment", () => {
        expect(orbFrame(120, 3.2)).toEqual(orbFrame(120, 3.2));
    });
});
