import { describe, expect, it } from "vitest";
import { holoVariant } from "./variant";

describe("holo family for the API's one rarity spelling", () => {
    it("draws Holo Rare LV.X as the LV.X foil it was as Rare Holo LV.X", () => {
        expect(holoVariant("Holo Rare LV.X", null, null).rarity).toBe(holoVariant("Rare Holo LV.X", null, null).rarity);
        expect(holoVariant("Holo Rare LV.X", null, null).rarity).toBe("rare holo v");
    });

    /** Every rarity the API stores, catalogue and collection rows alike, as read on 2026-09-15. */
    const STORED = [
        "Common",
        "Uncommon",
        "Rare",
        "Holo Rare",
        "Ultra Rare",
        "Promo",
        "Double Rare",
        "Super Rare",
        "Illustration Rare",
        "Secret Rare",
        "Shiny Rare",
        "Art Rare",
        "Hyper Rare",
        "Special Illustration Rare",
        "Special Art Rare",
        "Holo Rare V",
        "Galarian Gallery",
        "Triple Rare",
        "Holo Rare VMAX",
        "Shiny Super Rare",
        "ACE SPEC Rare",
        "Holo Rare LV.X",
        "Character Rare",
        "Character Super Rare",
        "Prism Rare",
        "Radiant Rare",
        "Trainer Rare",
        "LEGEND",
        "Holo Rare VSTAR",
        "Rare PRIME",
        "Classic Collection",
        "Super Rare Holo",
        "Amazing Rare",
        "Shiny Ultra Rare",
        "Shiny Rare V",
        "Mega Attack Rare",
        "Mega Hyper Rare",
        "Mega Ultra Rare",
        "Shiny Rare VMAX",
        "Black White Rare",
        "Rainbow Rare",
        "Holo Rare ex",
        "Holo Rare GX",
        "Pikachu Rare",
        "Futuristic Rare",
    ];
    const PLAIN = new Set(["Common", "Uncommon", "Rare", "Classic Collection", "Promo"]);

    it("gives every stored rarity above the plain ones and Promo a shine", () => {
        for (const r of STORED) {
            if (PLAIN.has(r)) continue;
            expect(holoVariant(r, null, null).rarity, r).not.toMatch(/^(common|uncommon|rare)$/);
        }
    });

    it("gives a promo a Common's light, whatever its finish; a reverse copy keeps its reverse", () => {
        expect(holoVariant("Promo", null, null).rarity).toBe("common");
        expect(holoVariant("Promo", "holo", null, { gen: "Scarlet & Violet" }).rarity).toBe("common");
        expect(holoVariant("Promo", "normal", null).rarity).toBe("common");
        expect(holoVariant("Promo", "reverse-holo", null).rarity).toBe("common reverse holo");
    });
});
