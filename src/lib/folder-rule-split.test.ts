import { describe, expect, it } from "vitest";
import { rarityKept } from "./folder-rule";

describe("rarityKept", () => {
    it("keeps a plain rarity whatever the card, without case", () => {
        expect(rarityKept(["illustration rare"], "Illustration rare", "Fomantis")).toBe(true);
        expect(rarityKept(["Illustration rare"], "Ultra Rare", "Beedrill V")).toBe(false);
    });
    it("splits Ultra Rare by the kind of card", () => {
        expect(rarityKept(["Ultra Rare / v"], "Ultra Rare", "Beedrill V")).toBe(true);
        expect(rarityKept(["Ultra Rare / v"], "Ultra Rare", "Arceus VSTAR")).toBe(true);
        expect(rarityKept(["Ultra Rare / v"], "Ultra Rare", "Venusaur ex")).toBe(false);
        expect(rarityKept(["Ultra Rare / ex"], "Ultra Rare", "Venusaur ex")).toBe(true);
        expect(rarityKept(["Ultra Rare / other"], "Ultra Rare", "Professor’s Research")).toBe(true);
        expect(rarityKept(["Ultra Rare / other"], "Ultra Rare", "Venusaur ex")).toBe(false);
        expect(rarityKept(["Ultra Rare / v"], "Special illustration rare", "Venusaur ex")).toBe(false);
    });
});
