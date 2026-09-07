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
        expect(holoVariant("Common", "poke-ball", null).rarity).toBe("common reverse holo");
        expect(holoVariant("Rare", "master-ball", null).rarity).toBe("rare reverse holo");
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

    it("gives a holo from before Sword & Shield the starry foil", () => {
        expect(holoVariant("Rare Holo", null, null, { gen: "Base" }).rarity).toBe("rare holo cosmos");
        expect(holoVariant("Rare Holo", null, null, { gen: "Sun & Moon" }).rarity).toBe("rare holo cosmos");
        expect(holoVariant("Rare", "holo", null, { gen: "XY" }).rarity).toBe("rare holo cosmos");
        expect(holoVariant("Rare Holo", null, null, { gen: "Sword & Shield" }).rarity).toBe("rare holo");
        expect(holoVariant("Rare Holo", null, null, { gen: "Scarlet & Violet" }).rarity).toBe("rare holo");
        expect(holoVariant("Rare Holo", null, null, {}).rarity).toBe("rare holo");
        expect(holoVariant("Rare Holo", "reverse-holo", null, { gen: "Base" }).rarity).toBe("rare holo reverse holo");
    });

    it("knows a trainer once the facts say it has no HP and no stage", () => {
        const t = holoVariant("Rare Holo", null, { stage: null, hp: null });
        expect(t.supertype).toBe("trainer");
        expect(t.subtypes).toBe("supporter");
        expect(holoVariant("Rare Holo", null, { stage: "Basic", hp: 60 }).supertype).toBe("pokémon");
        expect(holoVariant("Rare Holo", null, null).supertype).toBe("pokémon");
    });

    it("places the window for a Wizards-era card and leaves the modern eras to the CSS", () => {
        expect(holoVariant("Rare Holo", null, { stage: "Basic", hp: 120 }, { gen: "Base" }).style["--clip"]).toBe("inset(11% 10.5% 48.5% 10.5%)");
        const trainer = holoVariant("Uncommon", "reverse-holo", { stage: null, hp: null }, { gen: "Base" }).style;
        expect(trainer["--clip"]).toBe("inset(22.5% 9.5% 41.5% 9.5%)");
        expect(trainer["--clip-invert"]).toContain("calc(100% - 9.5%)");
        expect(trainer["--clip-trainer"]).toBe(trainer["--clip"]);
        expect(holoVariant("Rare Holo", null, null, { gen: "Sword & Shield" }).style).toEqual({});
        expect(holoVariant("Rare Holo", null, null, { gen: "Sun & Moon" }).style).toEqual({});
        expect(holoVariant("Rare Holo", null, null, { gen: "EX" }).style).toEqual({});
    });

    it("gives the frames between the Wizards era and Sun & Moon their own windows", () => {
        expect(holoVariant("Rare Holo", null, null, { gen: "E-Card" }).style["--clip"]).toBe("inset(12% 9.5% 51.4% 9.5%)");
        expect(holoVariant("Rare Holo", null, null, { gen: "Diamond & Pearl" }).style["--clip"]).toBe("inset(9.1% 6.8% 49.9% 6.8%)");
        expect(holoVariant("Rare Holo", null, null, { gen: "Platinum" }).style["--clip"]).toBe("inset(9.1% 6.8% 49.9% 6.8%)");
        expect(holoVariant("Rare Holo", null, null, { gen: "HeartGold & SoulSilver" }).style["--clip"]).toBe("inset(8% 5% 47.5% 5%)");
        expect(holoVariant("Rare Holo", null, null, { gen: "Call of Legends" }).style["--clip"]).toBe("inset(8% 5% 47.5% 5%)");
        expect(holoVariant("Rare Holo", null, null, { gen: "Black & White" }).style["--clip"]).toBe("inset(10.3% 8.6% 50.3% 8.6%)");
        expect(holoVariant("Rare Holo", null, null, { gen: "XY" }).style["--clip"]).toBe("inset(10.3% 8.6% 50.3% 8.6%)");
        expect(holoVariant("Uncommon", null, { stage: null, hp: null }, { gen: "XY" }).style["--clip"]).toBe("inset(15.7% 9.5% 48.8% 9.5%)");
    });

    it("keeps only the type names the CSS has a glow for", () => {
        expect(holoVariant("Rare", null, null, { types: ["Lightning", "Colorless"] }).typeClasses).toEqual(["lightning"]);
        expect(holoVariant("Rare", null, null, { types: null }).typeClasses).toEqual([]);
    });
});

describe("a copy that knows its own foil", () => {
    /**
     * The era is a guess and it is wrong on modern cosmos cards. Three rows of a real Dex
     * export are Scarlet & Violet holos whose foil is cosmos; the era alone draws them with
     * Sword & Shield's sheen, which is the wrong picture of a card somebody owns.
     */
    it("uses the recorded pattern over the era", () => {
        const era = { gen: "Scarlet & Violet" };
        expect(holoVariant("Rare Holo", "holo", null, era).rarity).toBe("rare holo");
        expect(holoVariant("Rare Holo", "holo", null, era, "cosmos").rarity).toBe("rare holo cosmos");
    });

    it("still guesses from the era where nothing recorded a pattern", () => {
        expect(holoVariant("Rare Holo", "holo", null, { gen: "Black & White" }).rarity).toBe("rare holo cosmos");
        expect(holoVariant("Rare Holo", "holo", null, { gen: "Black & White" }, null).rarity).toBe("rare holo cosmos");
    });

    it("says nothing new about a card that is not a plain holo", () => {
        // A secret rare has its own effect; a foil pattern does not reach into it.
        expect(holoVariant("Secret Rare", "holo", null, { gen: "Scarlet & Violet" }, "cosmos").rarity).toBe("rare secret");
    });
});
