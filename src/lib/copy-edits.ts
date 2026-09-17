import { z } from "zod";
import { EDITIONS, FINISHES } from "@/lib/card-shapes";
import { WESTERN_LANGUAGES } from "@/lib/languages";

/**
 * What a copy may differ in from the row it comes from, as the server actions accept it.
 *
 * Apart from `copies.ts`, which the card sheet and every card tile reach in the browser: this
 * schema is only for the server boundary (dashboard/cards/actions.ts), and zod stays out of the
 * browser's first load by living here. Import it from server code only.
 */
export const copyEdits = z
    .object({
        // Only the Western printings: every row is from the English catalogue until the others can be added.
        language: z.enum(WESTERN_LANGUAGES.map((l) => l.code) as [string, ...string[]]).nullable(),
        condition: z.string().trim().max(40).nullable(),
        grade: z.string().trim().max(40).nullable(),
        finish: z.enum(FINISHES).nullable(),
        foilPattern: z.enum(["cosmos", "cracked-ice", "starlight", "confetti", "vertical-line"]).nullable(),
        edition: z.enum(EDITIONS).nullable(),
        collectionId: z.string().uuid().nullable(),
        purchasePrice: z.number().min(0).nullable(),
        purchaseDate: z.string().nullable(),
        acquiredAt: z.string(),
    })
    .partial();
export type CopyEdits = z.infer<typeof copyEdits>;
