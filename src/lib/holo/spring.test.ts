import { describe, expect, it } from "vitest";
import { Spring } from "./spring";

const INTERACT = { stiffness: 0.066, damping: 0.25 };
const SNAP = { stiffness: 0.01, damping: 0.06 };
const FRAME = 1000 / 60;

const run = (s: Spring<"x">, frames: number) => {
    const path: number[] = [];
    let settled = false;
    for (let i = 0; i < frames && !settled; i++) {
        settled = s.step(FRAME);
        path.push(s.value.x);
    }
    return { path, settled };
};

describe("Spring", () => {
    it("reaches its target and reports rest, then stays there", () => {
        const s = new Spring({ x: 0 }, INTERACT);
        s.set({ x: 100 });
        const { settled } = run(s, 600);
        expect(settled).toBe(true);
        expect(s.value.x).toBe(100);
        expect(s.step(FRAME)).toBe(true);
        expect(s.value.x).toBe(100);
    });

    it("settles within about a second on the interact numbers", () => {
        const s = new Spring({ x: 0 }, INTERACT);
        s.set({ x: 100 });
        const { path } = run(s, 600);
        expect(path.length).toBeLessThan(90);
    });

    it("moves little in the first frames of a soft start, and never runs away", () => {
        const s = new Spring({ x: 20 }, SNAP);
        s.set({ x: 0 }, { soft: 1 });
        s.step(FRAME);
        s.step(FRAME);
        expect(Math.abs(20 - s.value.x)).toBeLessThan(0.1);
        const { path } = run(s, 1200);
        expect(Math.max(...path.map(Math.abs))).toBeLessThan(25);
        expect(s.value.x).toBe(0);
    });

    it("keeps moving smoothly when the numbers change mid-flight", () => {
        const s = new Spring({ x: 0 }, INTERACT);
        s.set({ x: 100 });
        run(s, 10);
        const before = s.value.x;
        s.setParams(SNAP);
        s.set({ x: 0 }, { soft: 1 });
        s.step(FRAME);
        expect(Math.abs(s.value.x - before)).toBeLessThan(10);
    });

    it("treats a long gap as two frames at most", () => {
        const s = new Spring({ x: 0 }, INTERACT);
        s.set({ x: 100 });
        s.step(2000);
        expect(s.value.x).toBeLessThanOrEqual(100);
        expect(Number.isFinite(s.value.x)).toBe(true);
    });

    it("resets without motion", () => {
        const s = new Spring({ x: 0 }, INTERACT);
        s.set({ x: 100 });
        run(s, 5);
        s.reset({ x: 50 });
        expect(s.value.x).toBe(50);
        expect(s.step(FRAME)).toBe(true);
        expect(s.value.x).toBe(50);
    });
});
