import { describe, expect, it } from "vitest";
import { folderRuleSchema, matchesRule, pokedexSettingSchema, ruleChips, ruleSummary } from "./folder-rule";

const facets = { sets: [{ name: "sv04", title: "Paradox Rift" }], rarities: ["Common", "Illustration Rare"], gens: [], types: [] };

describe("ruleSummary", () => {
    it("names a generation when the range is one, and the numbers otherwise", () => {
        expect(ruleSummary({ dex: { from: 1, to: 151 } })).toBe("Gen 1 · Kanto (1–151)");
        expect(ruleSummary({ dex: { from: 1, to: 9 } })).toBe("Dex 1–9");
    });
    it("shows a set by its title when the facets know it, as written otherwise", () => {
        expect(ruleChips({ sets: ["sv04", "Obsidian Flames"], rarities: ["Illustration Rare"] }, facets)).toEqual([
            "Paradox Rift",
            "Obsidian Flames",
            "Illustration Rare",
        ]);
    });
});

describe("folderRuleSchema", () => {
    it("wants at least one clause and a range the right way round", () => {
        expect(folderRuleSchema.safeParse({}).success).toBe(false);
        expect(folderRuleSchema.safeParse({ dex: { from: 151, to: 1 } }).success).toBe(false);
        expect(folderRuleSchema.safeParse({ dex: { from: 1, to: 1026 } }).success).toBe(false);
        expect(folderRuleSchema.safeParse({ sets: [] }).success).toBe(false);
        expect(folderRuleSchema.safeParse({ dex: { from: 1, to: 151 }, rarities: ["Common"] }).success).toBe(true);
    });
});

describe("matchesRule", () => {
    const card = { species_id: 25, set_name: "Paradox Rift", rarity: "Illustration Rare", owned: true };
    it("reads the range, the set by name or title, and the rarity, owned only", () => {
        expect(matchesRule(card, { dex: { from: 1, to: 151 } })).toBe(true);
        expect(matchesRule({ ...card, species_id: 152 }, { dex: { from: 1, to: 151 } })).toBe(false);
        expect(matchesRule({ ...card, species_id: null }, { dex: { from: 1, to: 151 } })).toBe(false);
        expect(matchesRule(card, { sets: ["sv04"] }, facets)).toBe(true);
        expect(matchesRule(card, { sets: ["paradox rift"] })).toBe(true);
        expect(matchesRule(card, { rarities: ["illustration rare"] })).toBe(true);
        expect(matchesRule(card, { rarities: ["Common"] })).toBe(false);
        expect(matchesRule({ ...card, owned: false }, { dex: { from: 1, to: 151 } })).toBe(false);
    });
});

describe("pokedexSettingSchema", () => {
    it("wants the missing flag and a sane range", () => {
        expect(pokedexSettingSchema.safeParse({ missing: true }).success).toBe(true);
        expect(pokedexSettingSchema.safeParse({ missing: false, dex: { from: 1, to: 151 } }).success).toBe(true);
        expect(pokedexSettingSchema.safeParse({ dex: { from: 1, to: 151 } }).success).toBe(false);
        expect(pokedexSettingSchema.safeParse({ missing: true, dex: { from: 9, to: 1 } }).success).toBe(false);
    });
});
