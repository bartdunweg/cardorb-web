import { describe, expect, it } from "vitest";
import { pickPalette } from "./logo-color";

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

describe("pickPalette", () => {
    it("answers the logo's own colours, largest first, each the average of its own hue", () => {
        // A blue mark with an orange accent: not brown, and not brighter than drawn.
        const { data, width, height } = paint([
            [30, 70, 200, 255, 600],
            [240, 120, 20, 255, 300],
            [255, 255, 255, 255, 400],
        ]);
        expect(pickPalette(data, width, height)).toEqual(["#1e46c8", "#f07814"]);
    });

    it("leaves out a hue the logo has only a stroke of, and merges two shades of one hue", () => {
        const { data, width, height } = paint([
            [220, 30, 30, 255, 1000],
            [230, 60, 40, 255, 500],
            [30, 30, 220, 255, 100],
        ]);
        expect(pickPalette(data, width, height)).toEqual(["#df2821"]);
    });

    it("ignores transparent pixels and the anti-aliased edge", () => {
        const { data, width, height } = paint([
            [220, 30, 30, 255, 100],
            [30, 30, 220, 120, 900],
            [0, 0, 0, 0, 5000],
        ]);
        expect(pickPalette(data, width, height)).toEqual(["#dc1e1e"]);
    });

    it("answers nothing for a grey, black or white logo", () => {
        const { data, width, height } = paint([
            [40, 40, 40, 255, 500],
            [255, 255, 255, 255, 500],
            [128, 128, 128, 255, 500],
        ]);
        expect(pickPalette(data, width, height)).toEqual([]);
    });
});
