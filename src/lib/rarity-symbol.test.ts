import { describe, expect, it } from "vitest";
import { rarityMark, rarityMarkOfName, setIdOf } from "@/lib/rarity-symbol";

const on = (setId: string, language?: string) => ({ setId, language });

describe("setIdOf", () => {
    it("cuts the number off a catalogue id", () => {
        expect(setIdOf("sv10.5w-013")).toBe("sv10.5w");
        expect(setIdOf("M-P-001")).toBe("M-P");
        expect(setIdOf("base1-4")).toBe("base1");
        expect(setIdOf(null)).toBeNull();
    });
});

describe("rarityMark", () => {
    it("draws today's marks on a Scarlet & Violet or Mega Evolution card", () => {
        expect(rarityMark("Ultra Rare", on("sv03.5"))).toEqual({ kind: "ultra" });
        expect(rarityMark("Special Illustration Rare", on("sv08"))).toEqual({ kind: "special-illustration" });
        expect(rarityMark("Mega Hyper Rare", on("me02"))).toEqual({ kind: "mega-hyper" });
        expect(rarityMark("Pikachu Rare", on("30th"))).toEqual({ kind: "pikachu" });
        expect(rarityMark("Promo", on("svp"))).toEqual({ kind: "promo" });
    });

    it("draws one star on an older rare, whatever TCGdex calls it", () => {
        // A Sun & Moon GX is an "Ultra Rare" to TCGdex and prints a single black star.
        expect(rarityMark("Ultra Rare", on("sm3"))).toEqual({ kind: "rare" });
        expect(rarityMark("Holo Rare", on("base1"))).toEqual({ kind: "rare" });
        expect(rarityMark("Holo Rare VMAX", on("swsh4"))).toEqual({ kind: "rare" });
        expect(rarityMark("Secret Rare", on("xy12"))).toEqual({ kind: "rare" });
        expect(rarityMark("LEGEND", on("hgss2"))).toEqual({ kind: "rare" });
        expect(rarityMark("Common", on("base1"))).toEqual({ kind: "common" });
        expect(rarityMark("Uncommon", on("base1"))).toEqual({ kind: "uncommon" });
    });

    it("prints letters on a Japanese card from Black & White on, and the old marks before", () => {
        expect(rarityMark("Special Art Rare", on("SV4a"))).toEqual({ kind: "code", code: "SAR" });
        expect(rarityMark("Super Rare", on("SM9b"))).toEqual({ kind: "code", code: "SR" });
        expect(rarityMark("Mega Attack Rare", on("M2a"))).toEqual({ kind: "code", code: "MA" });
        expect(rarityMark("Common", on("XY9"))).toEqual({ kind: "code", code: "C" });
        expect(rarityMark("Rare", on("ADV1"))).toEqual({ kind: "rare" });
        expect(rarityMark("Promo", on("SV-P"))).toEqual({ kind: "promo" });
    });

    it("gives a card with no set the name's own mark, and none where the era would decide", () => {
        expect(rarityMark("Double Rare")).toEqual({ kind: "double" });
        expect(rarityMark("Ultra Rare")).toBeNull();
    });

    it("draws nothing where nobody confirmed the mark, or there is no rarity", () => {
        expect(rarityMark("Classic Collection", on("cel25c"))).toBeNull();
        expect(rarityMark("Prism Rare", on("SM8b"))).toBeNull();
        expect(rarityMark(null, on("sv01"))).toBeNull();
        expect(rarityMark("  ", on("sv01"))).toBeNull();
    });
});

describe("rarityMarkOfName", () => {
    it("gives a filter row the name's mark as an English card prints it today", () => {
        expect(rarityMarkOfName("Illustration Rare")).toEqual({ kind: "illustration" });
        expect(rarityMarkOfName("Holo Rare")).toEqual({ kind: "rare" });
    });

    it("gives a Japanese-only name its letters", () => {
        expect(rarityMarkOfName("Art Rare")).toEqual({ kind: "code", code: "AR" });
    });

    it("gives no mark to a name that prints two by era", () => {
        expect(rarityMarkOfName("Ultra Rare")).toBeNull();
        expect(rarityMarkOfName("Shiny Rare")).toBeNull();
    });
});
