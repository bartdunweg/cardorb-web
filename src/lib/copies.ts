import { z } from "zod";
import type { Card } from "@/lib/api-shapes";
import { WESTERN_LANGUAGES, languageOf } from "@/lib/languages";

/** The same card: the same set, number and name; a second row of it is another copy, not another card. */
export const sameCard = (a: Pick<Card, "set" | "number" | "name">, b: Pick<Card, "set" | "number" | "name">) =>
    a.set === b.set && (a.number ?? "") === (b.number ?? "") && a.name === b.name;

const rank = (c: Card) =>
    [languageOf(c.language).code === "en" ? "0" : "1", languageOf(c.language).label, c.finish ?? "", c.condition ?? "", c.grade ?? ""].join("|");

/** English first, then by language, finish, condition and grade, so a list of copies reads the same twice. */
export const sortCopies = (rows: Card[]) => [...rows].sort((a, b) => rank(a).localeCompare(rank(b)));

/** What a copy may differ in from the row it comes from. */
export const copyEdits = z
    .object({
        // Only the Western printings: every row is from the English catalogue until the others can be added.
        language: z.enum(WESTERN_LANGUAGES.map((l) => l.code) as [string, ...string[]]).nullable(),
        condition: z.string().trim().max(40).nullable(),
        grade: z.string().trim().max(40).nullable(),
        finish: z.enum(["normal", "reverse-holo", "holo", "poke-ball", "master-ball"]).nullable(),
        collectionId: z.string().uuid().nullable(),
        purchasePrice: z.number().min(0).nullable(),
        purchaseDate: z.string().nullable(),
        acquiredAt: z.string(),
    })
    .partial();
export type CopyEdits = z.infer<typeof copyEdits>;
