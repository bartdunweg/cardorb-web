"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type ColumnMap, type ImportPreview, type ImportResult, commitImport, previewImport } from "@/app/(app)/dashboard/import/actions";
import type { ImportRecord } from "@/app/(app)/dashboard/import/page";
import { LinkButton } from "@/components/app/link-button";
import { FileUploadDropZone } from "@/components/application/file-upload/file-upload-base";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { NativeSelect } from "@/components/base/select/select-native";
import { MAX_CSV_BYTES, readCsv } from "@/lib/csv-file";

/**
 * Choosing a file, seeing what it would do, and then doing it.
 *
 * The shape of this screen is one rule: an import cannot be undone, so nothing
 * is written until somebody has been shown, in numbers and in words, what
 * writing would mean. The button is not called Import — it says how many cards
 * it is about to add — and it does not exist until there is a preview.
 *
 * The columns question is only asked of files that raise it. An export the API
 * recognises comes back as `source: "dex"` with its columns already settled,
 * and asking somebody to map columns we have already read would make a working
 * import look like a broken one.
 */

const FIELDS: { key: keyof ColumnMap; label: string; required?: boolean }[] = [
    { key: "name", label: "Card name", required: true },
    { key: "set", label: "Set", required: true },
    { key: "number", label: "Number" },
    { key: "quantity", label: "Copies" },
    { key: "variant", label: "Printing" },
    { key: "rarity", label: "Rarity" },
    { key: "condition", label: "Condition" },
    { key: "language", label: "Language" },
    { key: "owned", label: "Owned" },
    { key: "acquired", label: "Date added" },
    { key: "notes", label: "Notes" },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-4 rounded-xl bg-primary p-5 shadow-lift-xs ring-1 ring-primary ring-inset">
            <div className="flex flex-col gap-0.5">
                <h2 className="text-md font-semibold text-primary">{title}</h2>
                {description ? <p className="text-sm text-tertiary">{description}</p> : null}
            </div>
            {children}
        </section>
    );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

/**
 * What the preview means, as a sentence somebody can act on.
 *
 * Written out rather than shown as four numbers in boxes, because the question
 * being answered is "what happens if I press the button", and a row of figures
 * makes the reader do the arithmetic that decides whether to trust it.
 */
function summary(p: ImportPreview, includeExisting: boolean): string {
    const adding = p.sample.length === 0 && p.seen - p.skipped - p.existing === 0 ? 0 : p.seen - p.skipped - p.existing;
    const writing = includeExisting ? adding + p.existing : adding;
    const parts = [`${plural(writing, "card")} will be added.`];
    if (p.existing > 0) {
        parts.push(
            includeExisting
                ? `${plural(p.existing, "card")} you already have will be added again.`
                : `${plural(p.existing, "card")} you already have, skipped.`,
        );
    }
    if (p.skipped > 0) parts.push(`${plural(p.skipped, "row")} in the file could not be used.`);
    return parts.join(" ");
}

export function ImportCsv({ history }: { history: ImportRecord[] }) {
    const router = useRouter();

    const [fileName, setFileName] = useState<string | null>(null);
    const [csv, setCsv] = useState<string | null>(null);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [map, setMap] = useState<ColumnMap>({});
    const [header, setHeader] = useState<string[]>([]);
    const [includeExisting, setIncludeExisting] = useState(false);
    const [busy, setBusy] = useState<"reading" | "importing" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);

    const reset = () => {
        setPreview(null);
        setResult(null);
        setError(null);
        setMap({});
        setHeader([]);
        setIncludeExisting(false);
    };

    const run = async (text: string, columns: ColumnMap) => {
        setBusy("reading");
        setError(null);
        const outcome = await previewImport({ csv: text, map: Object.keys(columns).length ? columns : undefined });
        setBusy(null);

        if (outcome.ok) {
            setPreview(outcome.preview);
            setHeader(outcome.preview.header ?? []);
            if (outcome.preview.guessed) setMap(outcome.preview.guessed);
            return;
        }
        // A file whose name and set columns could not be found still hands back
        // its header, so the question can be asked instead of just refused.
        setPreview(null);
        setError(outcome.error);
        if (outcome.header) setHeader(outcome.header);
        if (outcome.guessed) setMap(outcome.guessed);
    };

    const onPick = async (files: FileList) => {
        const file = files[0];
        if (!file) return;

        reset();
        setFileName(file.name);
        setBusy("reading");
        const read = readCsv(await file.arrayBuffer());
        if (!read.ok) {
            setBusy(null);
            setCsv(null);
            setError(read.error);
            return;
        }
        setCsv(read.text);
        await run(read.text, {});
    };

    const onColumn = async (key: keyof ColumnMap, value: string) => {
        const next = { ...map };
        if (value === "") delete next[key];
        else next[key] = Number(value);
        setMap(next);
        if (csv) await run(csv, next);
    };

    const onImport = async () => {
        if (!csv) return;
        setBusy("importing");
        setError(null);
        const outcome = await commitImport({
            csv,
            map: Object.keys(map).length ? map : undefined,
            includeExisting,
        });
        setBusy(null);

        if (!outcome.ok) {
            setError(outcome.error);
            return;
        }
        setResult(outcome.result);
        setPreview(null);
        // The history above comes from a server component, and the collection
        // this just wrote to is behind the same cache.
        router.refresh();
    };

    const adding = preview ? preview.seen - preview.skipped - preview.existing : 0;
    const writing = includeExisting && preview ? adding + preview.existing : adding;

    return (
        <div className="flex flex-col gap-4">
            <Section title="Choose a file" description="A CSV export from Dex, Notion, or any spreadsheet with a card name and a set. Up to 2 MB.">
                <FileUploadDropZone
                    accept=".csv,text/csv,text/plain"
                    allowsMultiple={false}
                    maxSize={MAX_CSV_BYTES}
                    hint="CSV, up to 2 MB. UTF-8 or UTF-16, commas or semicolons — all fine."
                    isDisabled={busy !== null}
                    onDropFiles={onPick}
                    onDropUnacceptedFiles={() => setError("That is not a CSV file.")}
                    onSizeLimitExceed={() => setError("That file is too large. The limit is 2 MB.")}
                />
                {fileName ? (
                    <p className="text-sm text-tertiary">
                        {fileName}
                        {busy === "reading" ? " — reading…" : null}
                    </p>
                ) : null}
            </Section>

            {/*
             * Errors and results are announced, not just drawn: somebody who
             * cannot see the panel appear still needs to be told the import
             * finished, and what it did.
             */}
            {error ? (
                <p role="alert" className="arrive text-sm text-error-primary">
                    {error}
                </p>
            ) : null}

            {result ? (
                <Section title="Done" description={`${plural(result.added, "card")} added to your collection.`}>
                    <output className="flex flex-col gap-3 text-sm text-secondary">
                        <span>
                            {plural(result.seen, "row")} read.
                            {result.existing > 0 ? ` ${plural(result.existing, "card")} you already had, left alone.` : ""}
                            {result.skipped > 0 ? ` ${plural(result.skipped, "row")} not used.` : ""}
                        </span>
                    </output>
                    <div className="flex gap-3">
                        <LinkButton href="/dashboard/cards" size="md">
                            View your cards
                        </LinkButton>
                        <Button
                            size="md"
                            color="secondary"
                            onClick={() => {
                                reset();
                                setCsv(null);
                                setFileName(null);
                            }}
                        >
                            Import another file
                        </Button>
                    </div>
                </Section>
            ) : null}

            {preview ? (
                <Section
                    title="What this will do"
                    description={
                        preview.source === "dex"
                            ? "This is an export from Dex. Its columns, copy counts and printings are already understood."
                            : "The columns below were worked out from the file's first row. Correct any that are wrong."
                    }
                >
                    <p aria-live="polite" className="text-sm font-medium text-primary">
                        {summary(preview, includeExisting)}
                    </p>

                    {preview.sample.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <caption className="sr-only">The first {preview.sample.length} cards this import would add</caption>
                                <thead>
                                    <tr className="border-b border-secondary text-left text-tertiary">
                                        <th scope="col" className="py-2 pr-4 font-medium">
                                            Card
                                        </th>
                                        <th scope="col" className="py-2 pr-4 font-medium">
                                            Set
                                        </th>
                                        <th scope="col" className="py-2 pr-4 font-medium">
                                            Number
                                        </th>
                                        <th scope="col" className="py-2 pr-4 font-medium">
                                            Printing
                                        </th>
                                        <th scope="col" className="py-2 pr-4 font-medium">
                                            Copies
                                        </th>
                                        <th scope="col" className="py-2 font-medium">
                                            Where
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.sample.map((row, i) => (
                                        <tr key={`${row.setName}-${row.number}-${row.name}-${i}`} className="border-b border-secondary last:border-0">
                                            <td className="py-2 pr-4 text-primary">{row.name}</td>
                                            <td className="py-2 pr-4 text-secondary">{row.setName}</td>
                                            <td className="py-2 pr-4 text-secondary">{row.number || "—"}</td>
                                            <td className="py-2 pr-4 text-secondary">{row.finish ?? "—"}</td>
                                            <td className="py-2 pr-4 text-secondary">{row.quantity ?? 1}</td>
                                            <td className="py-2 text-secondary">{row.owned ? "Collection" : "Wishlist"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : null}

                    {preview.source === "generic" && header.length > 0 ? (
                        <details className="rounded-lg ring-1 ring-secondary ring-inset">
                            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-secondary">Columns</summary>
                            <div className="grid gap-3 px-4 pt-1 pb-4 sm:grid-cols-2">
                                {FIELDS.map((field) => (
                                    <NativeSelect
                                        key={field.key}
                                        size="sm"
                                        label={field.required ? `${field.label} (required)` : field.label}
                                        value={map[field.key] === undefined ? "" : String(map[field.key])}
                                        disabled={busy !== null}
                                        onChange={(e) => void onColumn(field.key, e.target.value)}
                                        options={[
                                            { label: field.required ? "Choose a column" : "Not in this file", value: "" },
                                            ...header.map((h, i) => ({ label: h || `Column ${i + 1}`, value: String(i) })),
                                        ]}
                                    />
                                ))}
                            </div>
                        </details>
                    ) : null}

                    {preview.skippedRows.length > 0 ? (
                        <details className="rounded-lg ring-1 ring-secondary ring-inset">
                            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-secondary">
                                Rows not used ({preview.skipped.toLocaleString("en")})
                            </summary>
                            <ul className="flex flex-col gap-1 px-4 pt-1 pb-4 text-sm text-tertiary">
                                {preview.skippedRows.map((s) => (
                                    <li key={s.line}>
                                        Line {s.line}: {s.why}
                                    </li>
                                ))}
                                {preview.skipped > preview.skippedRows.length ? (
                                    <li>and {(preview.skipped - preview.skippedRows.length).toLocaleString("en")} more.</li>
                                ) : null}
                            </ul>
                        </details>
                    ) : null}

                    {preview.existing > 0 ? (
                        <Checkbox
                            isSelected={includeExisting}
                            onChange={setIncludeExisting}
                            label="Add cards I already have as well"
                            hint="Off by default. Turning this on gives you a second copy of each; there is no undo."
                        />
                    ) : null}

                    <div>
                        <Button size="md" isDisabled={writing === 0} isLoading={busy === "importing"} onClick={() => void onImport()}>
                            {writing === 0 ? "Nothing to add" : `Add ${plural(writing, "card")}`}
                        </Button>
                    </div>
                </Section>
            ) : null}

            {/*
             * The history is not in a card, on purpose. The two cards above are
             * the things being done — pick a file, decide what happens — and a
             * third panel of the same weight competes with them for something
             * nobody came here to read. It is a footnote: you look at it when a
             * number surprised you, and the rest of the time it should recede.
             */}
            {history.length > 0 ? (
                <section className="mt-2 flex flex-col gap-2">
                    <h2 className="text-sm font-medium text-secondary">Past imports</h2>
                    <ul className="flex flex-col gap-1.5 text-sm">
                        {history.map((run) => (
                            <li key={run.id} className="flex flex-wrap justify-between gap-x-4">
                                <span className="text-tertiary">
                                    {new Date(run.started_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                                </span>
                                <span className={run.status === "failed" ? "text-error-primary" : "text-tertiary"}>
                                    {run.status === "done"
                                        ? `${plural(run.rows_added ?? 0, "card")} added of ${plural(run.rows_seen ?? 0, "row")}`
                                        : run.status === "failed"
                                          ? `Failed — ${run.error ?? "no reason recorded"}`
                                          : "Still running"}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}
