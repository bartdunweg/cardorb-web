import { z } from "zod";
import type { Facets } from "@/lib/cards";

/**
 * A rule folder fills itself: every owned card that matches, AND between the fields, OR within a
 * list. The API validates the same shape (cardorb-api, lib/core/collection/folders.ts); this is the
 * client's copy, for the dialog and the server actions.
 */
export type FolderRule = { dex?: { from: number; to: number }; sets?: string[]; rarities?: string[] };
export type FolderKind = "manual" | "rule";

/** The last national dex number. Defined here, not read from pokedex.ts: that file reaches the
 * session and cannot be imported into a client component, and the dialog needs the number. */
export const NATIONAL_DEX_MAX = 1025;

/** The nine generations, as presets for the Pokédex range. */
export const GENERATIONS = [
    { label: "Gen 1 · Kanto", from: 1, to: 151 },
    { label: "Gen 2 · Johto", from: 152, to: 251 },
    { label: "Gen 3 · Hoenn", from: 252, to: 386 },
    { label: "Gen 4 · Sinnoh", from: 387, to: 493 },
    { label: "Gen 5 · Unova", from: 494, to: 649 },
    { label: "Gen 6 · Kalos", from: 650, to: 721 },
    { label: "Gen 7 · Alola", from: 722, to: 809 },
    { label: "Gen 8 · Galar", from: 810, to: 905 },
    { label: "Gen 9 · Paldea", from: 906, to: 1025 },
] as const;

const term = z.string().trim().min(1).max(100);
const list = z.array(term).min(1).max(20);

export const folderRuleSchema = z
    .object({
        dex: z
            .object({ from: z.number().int().min(1).max(NATIONAL_DEX_MAX), to: z.number().int().min(1).max(NATIONAL_DEX_MAX) })
            .refine((d) => d.from <= d.to, "The range runs backwards.")
            .optional(),
        sets: list.optional(),
        rarities: list.optional(),
    })
    .refine((r) => r.dex || r.sets?.length || r.rarities?.length, "Add a Pokédex range, a set or a rarity.");

const setTitle = (name: string, facets?: Facets) => facets?.sets.find((s) => s.name === name || s.title === name)?.title ?? name;

/** One clause per chip: "Dex 1–151", "Paldea Evolved", "Illustration Rare". */
export function ruleChips(rule: FolderRule, facets?: Facets): string[] {
    const chips: string[] = [];
    if (rule.dex) {
        const gen = GENERATIONS.find((g) => g.from === rule.dex!.from && g.to === rule.dex!.to);
        chips.push(gen ? `${gen.label} (${gen.from}–${gen.to})` : `Dex ${rule.dex.from}–${rule.dex.to}`);
    }
    for (const s of rule.sets ?? []) chips.push(setTitle(s, facets));
    for (const r of rule.rarities ?? []) chips.push(r);
    return chips;
}

/** The chips in one line, for a subtitle: "Dex 1–151 · Paldea Evolved · Illustration Rare". */
export const ruleSummary = (rule: FolderRule, facets?: Facets): string => ruleChips(rule, facets).join(" · ");
