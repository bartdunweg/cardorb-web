import { z } from "zod";
import { NATIONAL_DEX_MAX } from "@/lib/binder-rule";

/**
 * The schemas for a rule and a Pokédex setting, for the boundaries that parse them: the binder
 * server actions and the API's answers (api-shapes.ts). Apart from `binder-rule.ts`, whose helpers
 * the sidebar's dialog and the card sheet import into the browser, so zod stays out of their first load.
 */

const term = z.string().trim().min(1).max(100);
const list = z.array(term).min(1).max(20);

export const dexRangeSchema = z
    .object({ from: z.number().int().min(1).max(NATIONAL_DEX_MAX), to: z.number().int().min(1).max(NATIONAL_DEX_MAX) })
    .refine((d) => d.from <= d.to, "The range runs backwards.");

export const pokedexSettingSchema = z.object({ missing: z.boolean(), dex: dexRangeSchema.optional(), rarities: list.optional() });

export const binderRuleSchema = z
    .object({
        dex: dexRangeSchema.optional(),
        sets: list.optional(),
        rarities: list.optional(),
    })
    .refine((r) => r.dex || r.sets?.length || r.rarities?.length, "Add a Pokédex range, a set or a rarity.");
