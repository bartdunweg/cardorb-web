import { describe, expect, it } from "vitest";
import { priceChange } from "./price-change";

describe("priceChange", () => {
    it("says how far above the 30-day average the price sits, with the sign in the words", () => {
        const change = priceChange(2.52, 2.4);
        expect(change?.direction).toBe("up");
        expect(change?.text).toBe("+€0.12 · 5%");
        expect(change?.label).toBe("Up €0.12, 5 percent, against the 30-day average");
    });

    it("says how far below, with a proper minus", () => {
        const change = priceChange(2.28, 2.4);
        expect(change?.direction).toBe("down");
        expect(change?.text).toBe("−€0.12 · 5%");
        expect(change?.label).toBe("Down €0.12, 5 percent, against the 30-day average");
    });

    it("shows nothing under half a percent, under a cent, or when a figure is missing", () => {
        expect(priceChange(100.3, 100)).toBeNull(); // 0.3%
        expect(priceChange(0.505, 0.5)).toBeNull(); // 1%, but half a cent
        expect(priceChange(2.4, 2.4)).toBeNull();
        expect(priceChange(null, 2.4)).toBeNull();
        expect(priceChange(2.4, null)).toBeNull();
        expect(priceChange(2.4, 0)).toBeNull();
    });

    it("keeps a change that just clears both thresholds", () => {
        expect(priceChange(100.5, 100)?.text).toBe("+€0.50 · 1%");
    });
});
