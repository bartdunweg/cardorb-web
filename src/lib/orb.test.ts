import { describe, expect, it } from "vitest";
import { ORB_LOGO_SIZES, ORB_STILL_TIME, orbFrame, orbLogo, orbLogoSizeFor, orbLogoSvg, orbTuning } from "./orb";

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

    it.each(ORB_LOGO_SIZES)("keeps the %i px logo inside its square and round", (size) => {
        const { circle, dots } = orbLogo(size);
        expect(circle.cx).toBe(size / 2);
        expect(circle.cy).toBe(size / 2);
        for (const { x, y, r } of dots) {
            // Every dot within the circle's reach, plus its own radius: nothing pokes out of the round.
            expect(Math.hypot(x - circle.cx, y - circle.cy)).toBeLessThanOrEqual(circle.r + r + 1e-9);
            expect(x - r).toBeGreaterThanOrEqual(0);
            expect(x + r).toBeLessThanOrEqual(size);
        }
    });

    it("weights the logo's dots heavier as it shrinks", () => {
        const meanRadius = (size: number) => {
            const { dots } = orbLogo(size);
            return dots.reduce((sum, dot) => sum + dot.r, 0) / dots.length / size;
        };
        expect(meanRadius(28)).toBeGreaterThan(meanRadius(128));
    });

    it("shows a logo from the file drawn at or above its size", () => {
        expect(orbLogoSizeFor(16)).toBe(16);
        expect(orbLogoSizeFor(20)).toBe(28);
        expect(orbLogoSizeFor(64)).toBe(64);
        expect(orbLogoSizeFor(500)).toBe(128);
    });

    it("writes the logo as a standalone SVG in the colour asked for", () => {
        const svg = orbLogoSvg(28, "#0a0a0a");
        expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"')).toBe(true);
        expect(svg).toContain('fill="#0a0a0a"');
    });
});
