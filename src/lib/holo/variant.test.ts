import { describe, expect, it } from "vitest";
import { holoVariant } from "./variant";

const TCGDEX = [
    "ACE SPEC Rare",
    "Amazing Rare",
    "Black White Rare",
    "Classic Collection",
    "Common",
    "Crown",
    "Double rare",
    "Four Diamond",
    "Full Art Trainer",
    "Holo Rare",
    "Holo Rare V",
    "Holo Rare VMAX",
    "Holo Rare VSTAR",
    "Hyper rare",
    "Illustration rare",
    "LEGEND",
    "Mega Hyper Rare",
    "None",
    "One Diamond",
    "One Shiny",
    "One Star",
    "Promo",
    "Radiant Rare",
    "Rare",
    "Rare Holo",
    "Rare Holo LV.X",
    "Rare PRIME",
    "Secret Rare",
    "Shiny Ultra Rare",
    "Shiny rare",
    "Shiny rare V",
    "Shiny rare VMAX",
    "Special illustration rare",
    "Three Diamond",
    "Three Star",
    "Two Diamond",
    "Two Shiny",
    "Two Star",
    "Ultra Rare",
    "Uncommon",
];

const FAMILIES = new Set([
    "common",
    "uncommon",
    "rare",
    "rare holo",
    "rare holo v",
    "rare holo vmax",
    "rare holo vstar",
    "rare ultra",
    "rare rainbow alt",
    "rare secret",
    "radiant rare",
    "amazing rare",
    "rare shiny",
    "rare shiny v",
    "rare shiny vmax",
]);

describe("holoVariant", () => {
    it("sends every TCGdex rarity to a family the CSS knows", () => {
        for (const r of TCGDEX) expect(FAMILIES.has(holoVariant(r, null, null).rarity), r).toBe(true);
    });

    it("maps the named families", () => {
        expect(holoVariant("Rare Holo", null, null).rarity).toBe("rare holo");
        expect(holoVariant("Illustration rare", null, null).rarity).toBe("rare holo v");
        expect(holoVariant("Special illustration rare", null, null).rarity).toBe("rare ultra");
        expect(holoVariant("Hyper rare", null, null).rarity).toBe("rare secret");
        expect(holoVariant("Holo Rare VSTAR", null, null).rarity).toBe("rare holo vstar");
        expect(holoVariant("Shiny rare V", null, null).rarity).toBe("rare shiny v");
    });

    it("reads the rarity whatever its case, and takes nothing as Common", () => {
        expect(holoVariant(" rare HOLO ", null, null).rarity).toBe("rare holo");
        expect(holoVariant(null, null, null).rarity).toBe("common");
        expect(holoVariant("something new", null, null).rarity).toBe("common");
    });

    it("lets the copy's finish have the last word where a reverse or holo printing exists", () => {
        expect(holoVariant("Common", "reverse-holo", null).rarity).toBe("common reverse holo");
        expect(holoVariant("Rare Holo", "reverse-holo", null).rarity).toBe("rare holo reverse holo");
        expect(holoVariant("Holo Rare VMAX", "reverse-holo", null).rarity).toBe("rare holo vmax");
        expect(holoVariant("Rare", "holo", null).rarity).toBe("rare holo");
        expect(holoVariant("Ultra Rare", "holo", null).rarity).toBe("rare ultra");
        expect(holoVariant("Common", "normal", null).rarity).toBe("common");
    });

    it("takes the stage from the facts, basic when unknown", () => {
        expect(holoVariant("Rare Holo", null, null).subtypes).toBe("basic");
        expect(holoVariant("Rare Holo", null, { stage: "Stage1" }).subtypes).toBe("stage 1");
        expect(holoVariant("Rare Holo", null, { stage: "Stage 2" }).subtypes).toBe("stage 2");
        expect(holoVariant("Holo Rare VMAX", null, { stage: "VMAX" }).subtypes).toBe("vmax");
        expect(holoVariant("Rare", null, { stage: "Basic" }).subtypes).toBe("basic");
    });

    it("knows a full-art trainer and a trainer gallery printing", () => {
        const t = holoVariant("Full Art Trainer", null, null);
        expect(t.supertype).toBe("trainer");
        expect(t.subtypes).toBe("supporter");
        expect(holoVariant("Rare", null, null).supertype).toBe("pokémon");
        expect(holoVariant("Holo Rare V", null, null, { number: "TG05" }).trainerGallery).toBe(true);
        expect(holoVariant("Holo Rare V", null, null, { number: "GG12" }).trainerGallery).toBe(true);
        expect(holoVariant("Holo Rare V", null, null, { number: "25" }).trainerGallery).toBe(false);
    });

    it("keeps only the type names the CSS has a glow for", () => {
        expect(holoVariant("Rare", null, null, { types: ["Lightning", "Colorless"] }).typeClasses).toEqual(["lightning"]);
        expect(holoVariant("Rare", null, null, { types: null }).typeClasses).toEqual([]);
    });
});
