import { describe, expect, it } from "vitest";
import { NO_ART, artStack, nextArt } from "./card-art";

const a = { image_url: "a-low", image_high_url: "a-high" };
const b = { image_url: "b-low", image_high_url: "b-high" };

describe("the sheet's art layers", () => {
    it("opens on one layer, nothing underneath", () => {
        const art = nextArt(NO_ART, a);
        expect(art).toEqual({ shown: { scan: "a-high", blur: "a-low" }, under: null, swapped: false });
        expect(artStack(art)).toEqual([{ layer: art.shown, shown: true }]);
    });

    it("keeps the last picture underneath the next one", () => {
        const art = nextArt(nextArt(NO_ART, a), b);
        expect(art.under).toEqual({ scan: "a-high", blur: "a-low" });
        expect(art.shown).toEqual({ scan: "b-high", blur: "b-low" });
        expect(art.swapped).toBe(false);
        expect(artStack(art).map((l) => l.layer.scan)).toEqual(["a-high", "b-high"]);
    });

    // The set page opens a card you hold twice: the catalogue's first, then its row, under another
    // id but with the same scan. The picture is already there; nothing crosses.
    it("is unchanged for the same picture behind another card", () => {
        const first = nextArt(NO_ART, a);
        expect(nextArt(first, { ...a })).toBe(first);
    });

    it("falls back to the low scan where there is no high one", () => {
        expect(nextArt(NO_ART, { image_url: "low", image_high_url: null }).shown).toEqual({ scan: "low", blur: "low" });
    });

    it("knows when the card stepped back to is the one still fading out", () => {
        const art = nextArt(nextArt(nextArt(NO_ART, a), b), a);
        expect(art.swapped).toBe(true);
        expect(art.under?.scan).toBe("b-high");
        expect(art.shown?.scan).toBe("a-high");
    });

    it("is empty for a card without a picture, and stays the same object", () => {
        expect(nextArt(nextArt(NO_ART, a), { image_url: null })).toBe(NO_ART);
        expect(nextArt(NO_ART, null)).toBe(NO_ART);
    });
});
