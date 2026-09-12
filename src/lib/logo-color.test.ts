import { describe, expect, it } from "vitest";
import { pickVividColor } from "./logo-color";

/** An RGBA buffer painted from a list of [r, g, b, a, count] runs. */
function paint(runs: [number, number, number, number, number][]): { data: Uint8Array; width: number; height: number } {
    const count = runs.reduce((n, run) => n + run[4], 0);
    const data = new Uint8Array(count * 4);
    let i = 0;
    for (const [r, g, b, a, n] of runs) {
        for (let k = 0; k < n; k++) {
            data.set([r, g, b, a], i);
            i += 4;
        }
    }
    return { data, width: count, height: 1 };
}

describe("pickVividColor", () => {
    it("picks the largest vivid hue, not the average of every colour", () => {
        // A blue mark with an orange accent: the average would be brown; the answer is the blue.
        const { data, width, height } = paint([
            [30, 70, 200, 255, 600],
            [240, 120, 20, 255, 300],
            [255, 255, 255, 255, 400],
        ]);
        expect(pickVividColor(data, width, height)).toBe("#1e46c8");
    });

    it("ignores transparent pixels and the anti-aliased edge", () => {
        const { data, width, height } = paint([
            [220, 30, 30, 255, 100],
            [30, 30, 220, 120, 900],
            [0, 0, 0, 0, 5000],
        ]);
        expect(pickVividColor(data, width, height)).toBe("#dc1e1e");
    });

    it("answers null for a grey, black or white logo", () => {
        const { data, width, height } = paint([
            [40, 40, 40, 255, 500],
            [255, 255, 255, 255, 500],
            [128, 128, 128, 255, 500],
        ]);
        expect(pickVividColor(data, width, height)).toBeNull();
    });

    it("answers null when the vivid part is a sliver of the mark", () => {
        const { data, width, height } = paint([
            [40, 40, 40, 255, 1000],
            [220, 30, 30, 255, 20],
        ]);
        expect(pickVividColor(data, width, height)).toBeNull();
    });
});
