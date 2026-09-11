import { z } from "zod";
import { type Card, FINISH_LABELS, FOIL_PATTERN_LABELS, type Finish, type FoilPattern } from "@/lib/api-shapes";
import { WESTERN_LANGUAGES, languageOf } from "@/lib/languages";

/** One card as the sheet, a list or a search names it: set, number, name, and the set's title where known. */
export type CardName = Pick<Card, "set" | "number" | "name"> & Partial<Pick<Card, "set_name">>;

/**
 * The names a card's set goes by: the API stores a set under one name and titles it under
 * another ("SV Black Star Promos", titled "SVP Black Star Promos"), and the catalogue, so a
 * search hit or a set page, knows only the title. Most sets are named once, both ways.
 */
const setNames = (c: CardName): string[] => [c.set, c.set_name].filter((s): s is string => Boolean(s));

/**
 * The same card: the same set, number and name; a second row of it is another copy, not another
 * card. A set matches under any name it goes by, so a row the API answered for the set's title
 * is not dropped for being stored under the set's name (the SVP Pikachu opened on the catalogue's
 * card, and every action in the sheet's bar answered "Invalid input").
 */
export const sameCard = (a: CardName, b: CardName) => {
    const sets = setNames(b);
    const sameSet = a.set === b.set || setNames(a).some((s) => sets.includes(s));
    return sameSet && (a.number ?? "") === (b.number ?? "") && a.name === b.name;
};

const rank = (c: Card) =>
    [
        languageOf(c.language).code === "en" ? "0" : "1",
        languageOf(c.language).label,
        c.finish ?? "",
        c.foil_pattern ?? "",
        c.condition ?? "",
        c.grade ?? "",
    ].join("|");

/** English first, then by language, finish, condition and grade, so a list of copies reads the same twice. */
export const sortCopies = (rows: Card[]) => [...rows].sort((a, b) => rank(a).localeCompare(rank(b)));

/**
 * Everything that makes one copy different from another. Two rows agreeing on all of it are the
 * same copy twice, whatever the database happens to have stored them as.
 */
const sameness = (c: Card) => [rank(c), c.collection_id ?? ""].join("|");

/**
 * Copies as a person counts them: one line per kind, with how many of it there are.
 *
 * The rows are one per purchase, and nothing ever merged them — so four identical Holo · Near
 * Mint copies were four lines reading "€2.81 ×1", four times, which says nothing four times.
 * They are one line of ×4. A line keeps the rows behind it, because removing it has to remove
 * all of them and the quantity has to be the sum rather than the first row's.
 */
export type CopyGroup = { key: string; shown: Card; rows: Card[]; quantity: number };

export const groupCopies = (rows: Card[]): CopyGroup[] => {
    const groups = new Map<string, CopyGroup>();
    for (const row of sortCopies(rows)) {
        const key = sameness(row);
        const found = groups.get(key);
        if (found) {
            found.rows.push(row);
            found.quantity += row.quantity ?? 1;
        } else {
            groups.set(key, { key, shown: row, rows: [row], quantity: row.quantity ?? 1 });
        }
    }
    return [...groups.values()];
};

/**
 * What kind of copy this is, as the sheet names it: "Holo · Cosmos · Near Mint · Kanto". The
 * finish, then the foil's pattern where one is recorded, the grade or else the condition, and the
 * binder it is filed in. A normal finish says nothing, since that is what a card is unless it is
 * something else; with nothing recorded at all it is a "Copy".
 */
export const copyLabel = (row: Card, folderName?: string | null): string =>
    [
        row.finish && row.finish !== "normal" ? (FINISH_LABELS[row.finish as Finish] ?? null) : null,
        row.foil_pattern ? (FOIL_PATTERN_LABELS[row.foil_pattern as FoilPattern] ?? null) : null,
        row.grade ?? row.condition,
        folderName,
    ]
        .filter(Boolean)
        .join(" · ") || "Copy";

/** What a copy may differ in from the row it comes from. */
export const copyEdits = z
    .object({
        // Only the Western printings: every row is from the English catalogue until the others can be added.
        language: z.enum(WESTERN_LANGUAGES.map((l) => l.code) as [string, ...string[]]).nullable(),
        condition: z.string().trim().max(40).nullable(),
        grade: z.string().trim().max(40).nullable(),
        finish: z.enum(["normal", "reverse-holo", "holo", "poke-ball", "master-ball"]).nullable(),
        foilPattern: z.enum(["cosmos", "cracked-ice", "starlight", "confetti", "vertical-line"]).nullable(),
        collectionId: z.string().uuid().nullable(),
        purchasePrice: z.number().min(0).nullable(),
        purchaseDate: z.string().nullable(),
        acquiredAt: z.string(),
    })
    .partial();
export type CopyEdits = z.infer<typeof copyEdits>;
