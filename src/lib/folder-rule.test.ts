import { describe, expect, it } from "vitest";
import { folderRuleSchema, ruleChips, ruleSummary } from "./folder-rule";

const facets = { sets: [{ name: "sv04", title: "Paradox Rift" }], rarities: ["Common", "Illustration Rare"] };

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
