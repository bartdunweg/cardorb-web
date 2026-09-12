import { describe, expect, it } from "vitest";
import { NOT_KNOWN, RARITIES_BY_HAND, isUnnamedRarity, raritiesFor } from "./rarities";

const values = (era?: readonly string[] | null, said?: string | null) => raritiesFor(era, said).map((r) => r.value);

describe("isUnnamedRarity", () => {
    it("reads a set's mark and a blank as nobody having said", () => {
        expect(isUnnamedRarity("Promo")).toBe(true);
        expect(isUnnamedRarity("None")).toBe(true);
        expect(isUnnamedRarity("  ")).toBe(true);
        expect(isUnnamedRarity("Double rare")).toBe(false);
    });
});

describe("raritiesFor", () => {
    it("offers everything where the catalogue could not say", () => {
        expect(raritiesFor(null)).toBe(RARITIES_BY_HAND);
        expect(raritiesFor([])).toBe(RARITIES_BY_HAND);
    });

    it("offers a 1999 promo the three words that era printed", () => {
        expect(values(["Common", "Rare", "Uncommon"])).toEqual(["Rare", "Uncommon", "Common", NOT_KNOWN]);
    });

    it("offers a Scarlet & Violet promo its era's words and not Holo Rare", () => {
        const era = ["Common", "Double rare", "Hyper rare", "Illustration rare", "Special illustration rare", "Ultra Rare", "Uncommon"];
        expect(values(era)).toEqual([
            "Special illustration rare",
            "Illustration rare",
            "Ultra Rare",
            "Hyper rare",
            "Double rare",
            "Uncommon",
            "Common",
            NOT_KNOWN,
        ]);
    });

    it("keeps the era's own words this app has no name for, after the ones it does", () => {
        expect(values(["Common", "Radiant Rare", "Amazing Rare"])).toEqual(["Common", "Amazing Rare", "Radiant Rare", NOT_KNOWN]);
    });

    it("keeps a rarity already said, whatever the era claims", () => {
        expect(values(["Common"], "Secret Rare")).toContain("Secret Rare");
        expect(values(["Common"], "Secret Rare").filter((v) => v === "Secret Rare")).toHaveLength(1);
    });

    it("compares spellings without case, the way the catalogue writes them two ways", () => {
        expect(values(["holo rare"])).toEqual(["Holo Rare", NOT_KNOWN]);
    });

    it("ends with taking the answer back, once", () => {
        const out = values(["Common", NOT_KNOWN]);
        expect(out.at(-1)).toBe(NOT_KNOWN);
        expect(out.filter((v) => v === NOT_KNOWN)).toHaveLength(1);
    });
});
