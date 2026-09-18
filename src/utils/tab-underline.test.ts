import { describe, expect, it } from "vitest";
import { underlinePlace } from "./tab-underline";

/* The numbers are the ones measured on screen: Base Set's "All" tab (300 to 367.641 at a device
   pixel ratio of 2) and the card sheet's "Unlimited" printing, whose list runs 24px wider than the
   box the line is placed in (list 1040, box 1064). */
describe("underlinePlace", () => {
    it("places the line against the box it is drawn in, not against a wider tab list", () => {
        // The sheet's printings: the list is `-mx-6 px-6`, so reading the tab against the list put
        // the line 24px to the right of it.
        const place = underlinePlace({ left: 1254.508, right: 1326.797 }, { left: 1064, right: 1416 }, 2);

        expect(place.left).toBeCloseTo(190.5, 3);
        expect(place.left + place.width).toBeCloseTo(263, 3);
    });

    it("keeps both ends on a whole device pixel", () => {
        const place = underlinePlace({ left: 300, right: 367.641 }, { left: 300, right: 1416 }, 2);

        expect(place.left).toBe(0);
        expect(place.width).toBe(67.5);
        expect((place.left * 2) % 1).toBe(0);
        expect(((place.left + place.width) * 2) % 1).toBe(0);
    });

    it("ends within half a device pixel of the tab's own end", () => {
        const tab = { left: 510.672, right: 601.367 };
        const box = { left: 300, right: 1416 };

        const place = underlinePlace(tab, box, 2);

        expect(Math.abs(place.left - (tab.left - box.left))).toBeLessThanOrEqual(0.25);
        expect(Math.abs(place.left + place.width - (tab.right - box.left))).toBeLessThanOrEqual(0.25);
    });

    it("never asks for a negative width", () => {
        expect(underlinePlace({ left: 40, right: 20 }, { left: 0, right: 100 }, 1).width).toBe(0);
    });
});
