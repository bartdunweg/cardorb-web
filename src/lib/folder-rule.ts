import { z } from "zod";
import type { Facets } from "@/lib/cards";

/**
 * A rule folder fills itself: every owned card that matches, AND between the fields, OR within a
 * list. The API validates the same shape (cardorb-api, lib/core/collection/folders.ts); this is the
 * client's copy, for the dialog and the server actions.
 */
export type DexRange = { from: number; to: number };
export type FolderRule = { dex?: DexRange; sets?: string[]; rarities?: string[] };

/**
 * A folder shown as a Pokédex: its cards in the national order, one slot per Pokémon. `missing`
 * shows the slots the folder has no card of; `dex` is the range collected, all of it when absent.
 */
export type PokedexSetting = { missing: boolean; dex?: DexRange; rarities?: string[]; kinds?: string[] };

/**
 * The kinds of card, read off the name's suffix: what a rarity cannot tell apart. A full-art V
 * from Sword & Shield and a full-art ex from Scarlet & Violet are both "Ultra Rare"; the kind is
 * what separates them. "Regular" is a card with no suffix at all.
 */
export const CARD_KINDS: { id: string; label: string; test: (name: string) => boolean }[] = [
    { id: "regular", label: "Regular", test: () => false },
    // Mega and Tag Team before the suffixes they end in: "M Charizard EX" is a Mega, not an EX.
    { id: "mega", label: "Mega", test: (n) => /^M(ega)? /.test(n) },
    { id: "tag-team", label: "Tag Team", test: (n) => /&/.test(n) && /\b(GX|ex)$/.test(n) },
    { id: "ex", label: "ex", test: (n) => /\bex$/.test(n) },
    { id: "EX", label: "EX", test: (n) => /\bEX$/.test(n) },
    { id: "GX", label: "GX", test: (n) => /\bGX$/.test(n) },
    { id: "V", label: "V", test: (n) => /\bV$/.test(n) },
    { id: "VMAX", label: "VMAX", test: (n) => /\bVMAX$/.test(n) },
    { id: "VSTAR", label: "VSTAR", test: (n) => /\bVSTAR$/.test(n) },
    { id: "radiant", label: "Radiant", test: (n) => /^Radiant /.test(n) },
    { id: "break", label: "BREAK", test: (n) => /\bBREAK$/.test(n) },
];

/** Which kind a card is, by its name; "regular" when no suffix names one. */
export function kindOf(name: string): string {
    const n = name.trim();
    return CARD_KINDS.find((k) => k.id !== "regular" && k.test(n))?.id ?? "regular";
}

/**
 * The rarities that are a whole picture: the art fills the card. What a "full-art Pokédex" keeps.
 * The catalogue spells a few of these two ways; the reader compares without case.
 */
export const FULL_ART_RARITIES = ["Illustration rare", "Special illustration rare", "Ultra Rare", "Hyper rare", "Secret Rare"];

export const DEFAULT_POKEDEX: PokedexSetting = { missing: true };
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

export const dexRangeSchema = z
    .object({ from: z.number().int().min(1).max(NATIONAL_DEX_MAX), to: z.number().int().min(1).max(NATIONAL_DEX_MAX) })
    .refine((d) => d.from <= d.to, "The range runs backwards.");

export const pokedexSettingSchema = z.object({ missing: z.boolean(), dex: dexRangeSchema.optional(), rarities: list.optional(), kinds: list.optional() });

export const folderRuleSchema = z
    .object({
        dex: dexRangeSchema.optional(),
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

/** What a rule reads on a card. */
export type RuleSubject = { species_id: number | null; set_name: string | null; rarity: string | null; owned: boolean | null };

/**
 * Whether a card is in a rule folder, with the API's semantics (cardorb-api, folders.ts
 * ruleMatcher): owned only, the dex range on the card's number, a set by its name or its title,
 * a rarity, all case-insensitive. The card sheet uses it to say which folders hold a card.
 */
export function matchesRule(card: RuleSubject, rule: FolderRule, facets?: Facets): boolean {
    if (!card.owned) return false;
    if (rule.dex && (card.species_id === null || card.species_id < rule.dex.from || card.species_id > rule.dex.to)) return false;
    if (rule.sets) {
        const own = (card.set_name ?? "").toLowerCase();
        const names = rule.sets.map((s) => s.toLowerCase());
        // The card carries the set's title; a rule may name the set either way.
        const titles = facets?.sets.filter((s) => names.includes(s.name.toLowerCase())).map((s) => s.title.toLowerCase()) ?? [];
        if (!names.includes(own) && !titles.includes(own)) return false;
    }
    if (rule.rarities && !rule.rarities.map((r) => r.toLowerCase()).includes((card.rarity ?? "").toLowerCase())) return false;
    return true;
}
