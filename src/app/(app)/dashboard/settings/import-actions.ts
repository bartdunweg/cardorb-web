"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { MAX_CSV_BYTES } from "@/lib/csv-file";
import { forgetMine } from "@/lib/user-cache";

/**
 * The two halves of an import: show me what you would do, then do it.
 *
 * Both are the same call to the API with one flag between them, which is what
 * makes the preview worth trusting: it is not a second implementation that
 * might disagree, it is the same code stopping one step early.
 */

/** Which column of the file holds which field, as zero-based indices. */
const columnMap = z
    .object({
        name: z.number().int().min(0),
        set: z.number().int().min(0),
        number: z.number().int().min(0),
        rarity: z.number().int().min(0),
        gen: z.number().int().min(0),
        types: z.number().int().min(0),
        owned: z.number().int().min(0),
        acquired: z.number().int().min(0),
        quantity: z.number().int().min(0),
        variant: z.number().int().min(0),
        condition: z.number().int().min(0),
        language: z.number().int().min(0),
        notes: z.number().int().min(0),
    })
    .partial();

export type ColumnMap = z.infer<typeof columnMap>;

const request = z.object({
    csv: z.string().trim().min(1, "That file is empty.").max(MAX_CSV_BYTES, "That file is too large. The limit is 2 MB."),
    map: columnMap.optional(),
});

/*
 * The schemas stay inside this file. A "use server" file may export nothing but
 * async functions. Next checks that when the module is evaluated, and one
 * exported zod object was enough for every import to answer 500 from the 7th
 * of September (#263) until somebody said "nothing happens". Types are fine,
 * they do not exist at runtime.
 */

/** `null` and "the key was not sent" are one answer here too. */
const nullable = <T extends z.ZodType>(inner: T) => inner.nullish().transform((v) => v ?? null);

/** One row as it will be stored, for the handful the preview shows. */
const importRow = z.object({
    name: z.string(),
    number: z.string(),
    setName: z.string(),
    rarity: nullable(z.string()),
    owned: z.boolean(),
    quantity: nullable(z.number()),
    finish: nullable(z.string()),
    /** What the foil looks like, where the file named a pattern. Not the same as the finish. */
    foilPattern: nullable(z.string()),
});
export type ImportRow = z.infer<typeof importRow>;

const importPreviewAnswer = z.object({
    /** Everything the file held, rows written and rows passed over alike. */
    seen: z.number(),
    /** Rows not written: printings the file records as not held, plus rows it could not read. */
    skipped: z.number(),
    /**
     * Of `skipped`, the printings the file itself records at zero. Not a problem: an export
     * lists every printing of every card you hold, so most of a real file is this.
     */
    notOwned: z.number(),
    /**
     * Rows naming a card the collection already holds. Said out loud, not acted on: every row
     * is added. It is the only warning there is against importing the same file a second time.
     */
    existing: z.number(),
    sample: z.array(importRow),
    /** Whether the file was recognised, or read by a guess at its columns. */
    source: z.enum(["dex", "generic"]),
    header: z.array(z.string()),
    guessed: columnMap.optional(),
    skippedRows: z.array(z.object({ line: z.number(), why: z.string() })),
});
export type ImportPreview = z.infer<typeof importPreviewAnswer>;

const importResultAnswer = z.object({
    seen: z.number(),
    added: z.number(),
    skipped: z.number(),
    notOwned: z.number(),
    existing: z.number(),
});
export type ImportResult = z.infer<typeof importResultAnswer>;

export type PreviewOutcome =
    | { ok: true; preview: ImportPreview }
    /** A file whose name and set columns could not be found still hands back its header. */
    | { ok: false; error: string; header?: string[]; guessed?: ColumnMap };

const failed = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof ApiError ? err.message : "Something went wrong. Try again.",
});

/**
 * What the import would do. Writes nothing.
 *
 * The 400 this can get is not only a refusal: when the columns could not be
 * guessed, the answer carries the file's header row and the guess it managed,
 * which is exactly what the screen needs to ask the question. That is why
 * ApiError keeps `details`.
 */
export async function previewImport(input: unknown): Promise<PreviewOutcome> {
    const parsed = request.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

    try {
        const preview = await api("/import/csv", {
            method: "POST",
            body: { csv: parsed.data.csv, map: parsed.data.map },
            schema: importPreviewAnswer,
        });
        return { ok: true, preview };
    } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
            const d = err.details as { header?: string[]; guessed?: ColumnMap } | undefined;
            if (d?.header) return { ok: false, error: err.message, header: d.header, guessed: d.guessed };
        }
        return failed(err);
    }
}

/**
 * The write.
 *
 * Two minutes rather than the usual thirty seconds. The API allows itself five
 * for this and a few thousand inserts can use them; giving up at thirty would
 * abandon a write that is going to finish anyway and report it as a failure,
 * on the one operation in this app that nobody can undo. On a timeout the
 * screen says the write may still be finishing, rather than inviting a second
 * run that would double everything the first one wrote.
 */
export async function commitImport(input: unknown): Promise<{ ok: true; result: ImportResult } | { ok: false; error: string }> {
    const parsed = request.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

    try {
        const result = await api("/import/csv", {
            method: "POST",
            body: { csv: parsed.data.csv, map: parsed.data.map, commit: true },
            timeoutMs: 120_000,
            schema: importResultAnswer,
        });
        return { ok: true, result };
    } catch (err) {
        if (err instanceof Error && err.name === "TimeoutError") {
            return {
                ok: false,
                error: "That import is taking longer than expected. It may still be finishing. Close this, reload, and check your cards before trying again.",
            };
        }
        return failed(err);
    } finally {
        // Whatever happened, including the timeout: two minutes is short of the five the API
        // allows itself, so a give-up here is precisely the case where the rows did land. Leaving
        // the cached counts alone would show the person their collection from before the import,
        // exactly as they were told to go and check it, and invite a second run of the one action
        // in this app that cannot be undone. Dropping a cache after a write is never wrong.
        await forgetMine();
    }
}
