"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { type ColumnMap, type ImportPreview, type ImportResult, commitImport, previewImport } from "@/app/(app)/dashboard/settings/import-actions";
import { FormError } from "@/components/app/form-error";
import { LinkButton } from "@/components/app/link-button";
import { FileUploadDropZone } from "@/components/application/file-upload/file-upload-base";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { NativeSelect } from "@/components/base/select/select-native";
import { MAX_CSV_BYTES, readCsv } from "@/lib/csv-file";

/**
 * Choosing a file, seeing what it would do, and then doing it.
 *
 * The shape of this is one rule: an import cannot be undone, so nothing is
 * written until somebody has been shown, in numbers and in words, what writing
 * would mean. The button is not called Import — it says how many cards it is
 * about to add — and it does not exist until there is a preview.
 *
 * A dialog rather than a page. An import is one errand you finish and leave,
 * not a place in the app: it has no address worth sharing, nothing links to it,
 * and coming back to Settings afterwards is the whole of "done". The kit's
 * modal is react-aria, so the focus trap, Escape and returning focus to the
 * button that opened it are already right (R-UI-001). On a phone it fills the
 * screen, because the preview is a table and half a screen of table is worse
 * than none.
 *
 * The form mounts inside the dialog, so it starts clean on every open — the
 * same reason folder-dialog.tsx does it. A dialog that remembered the last
 * file would offer to import it again, which is exactly the mistake this
 * screen exists to prevent.
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

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

/**
 * What the preview means, as a sentence somebody can act on.
 *
 * Written out rather than shown as four numbers in boxes, because the question
 * being answered is "what happens if I press the button", and a row of figures
 * makes the reader do the arithmetic that decides whether to trust it.
 */
function summary(p: ImportPreview): string {
    const parts = [`${plural(p.seen - p.skipped, "card")} will be added.`];
    /*
     * Three things used to be one word, "skipped", and each rewording of it was
     * still wrong until somebody looked at what those rows actually are.
     *
     * They are not cards you do not own. In a real 4,536-row export every one
     * of the 2,440 was another *printing* of a card its owner does have: an
     * Espeon he holds as Normal also arrives as Reverse Holo, National
     * Championships and National Championships (Staff), each at zero. So the
     * sentence names the printing, not the card, and says where they came
     * from — because "2,439 cards you do not own" is a number that makes a
     * person ask where those came from, and the answer should not be a
     * conversation.
     */
    if (p.notOwned > 0) {
        parts.push(
            p.source === "dex"
                ? `Dex also lists ${plural(p.notOwned, "printing")} you do not have — those are left alone.`
                : `${plural(p.notOwned, "row")} the file marks as not owned, left alone.`,
        );
    }
    const unreadable = p.skipped - p.notOwned;
    if (unreadable > 0) parts.push(`${plural(unreadable, "row")} could not be read.`);
    return parts.join(" ");
}

export function ImportDialog({ children }: { children: ReactNode }) {
    return (
        <DialogTrigger>
            {children}
            {/* No padding around it on a phone: the dialog is the screen there. */}
            <ModalOverlay className="max-sm:p-0">
                <Modal className="max-w-2xl max-sm:h-dvh max-sm:max-w-none max-sm:overflow-hidden max-sm:rounded-none">
                    <Dialog className="h-full">{({ close }) => <ImportForm close={close} />}</Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}

function ImportForm({ close }: { close: () => void }) {
    const router = useRouter();

    const [fileName, setFileName] = useState<string | null>(null);
    const [csv, setCsv] = useState<string | null>(null);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [map, setMap] = useState<ColumnMap>({});
    const [header, setHeader] = useState<string[]>([]);
    const [busy, setBusy] = useState<"reading" | "importing" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);

    const reset = () => {
        setPreview(null);
        setResult(null);
        setError(null);
        setMap({});
        setHeader([]);
    };

    /*
     * Every action here answers `{ ok: false }` for anything it saw coming, so
     * an actual throw is the case nobody wrote a sentence for: the request that
     * never reached the action at all. That is not hypothetical — a 1.4 MB file
     * once tripped Next's own body limit in front of the action, the promise
     * rejected, and the dialog sat on "reading…" with the drop zone disabled
     * and no button, which the person who hit it described as "nothing
     * happens". A rejection has to land somewhere on screen, and it has to put
     * `busy` down on the way, or the dialog is dead until it is closed.
     *
     * The write gets its own sentence: a preview that failed can simply be
     * asked again, but a write whose answer never arrived may have landed, and
     * "try again" there is an invitation to double a collection.
     */
    const guard = async (work: () => Promise<void>, message = "Something went wrong. Try again.") => {
        try {
            await work();
        } catch {
            setBusy(null);
            setError(message);
        }
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

    const onPick = (files: FileList) => {
        const file = files[0];
        if (!file) return;

        void guard(async () => {
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
        });
    };

    const onColumn = async (key: keyof ColumnMap, value: string) => {
        const next = { ...map };
        if (value === "") delete next[key];
        else next[key] = Number(value);
        setMap(next);
        if (csv) await guard(() => run(csv, next));
    };

    const onImport = () =>
        guard(async () => {
            if (!csv) return;
            setBusy("importing");
            setError(null);
            const outcome = await commitImport({ csv, map: Object.keys(map).length ? map : undefined });
            setBusy(null);

            if (!outcome.ok) {
                setError(outcome.error);
                return;
            }
            setResult(outcome.result);
            setPreview(null);
            // The collection this just wrote to is read through a cache the write
            // dropped; without this the cards page would show yesterday's count.
            router.refresh();
        }, "Something went wrong, and the import may or may not have finished. Close this, reload, and check your cards before trying again.");

    const writing = preview ? preview.seen - preview.skipped : 0;
    // The sample the API sends holds the first twenty skipped rows, mixed; only
    // the ones that actually failed are worth a line number.
    const unreadable = preview ? preview.skippedRows.filter((s) => !s.why.startsWith("not owned")) : [];

    return (
        // A column with one scrolling middle: the title stays put, and so does
        // the button that does the irreversible thing. On a long preview the
        // alternative is scrolling back up to find out what you agreed to.
        //
        // The height is stated rather than inherited. max-h-full on the kit's
        // Modal measures against an overlay that scrolls, so the dialog grew
        // past a 560px-tall window and put the Add button off the bottom of the
        // screen — the one control that must never be out of sight. The numbers
        // are the overlay's own padding, p-4 and sm:p-8.
        <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-xl bg-primary shadow-lg ring-1 ring-secondary max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none sm:max-h-[calc(100dvh-4rem)]">
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
                <div className="flex flex-col gap-1">
                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                        Import a collection
                    </AriaHeading>
                    <p className="text-sm text-tertiary">A CSV export from Dex, Notion, or any spreadsheet with a card name and a set. Up to 2 MB.</p>
                </div>
                {/*
                 * Escape closes this and so does Cancel, but on a phone the dialog is
                 * the whole screen: no dimmed page beside it to tap, no Escape key, and
                 * the footer is a scroll away while a long file is being read. The cross
                 * is the way out that is always where you expect it.
                 */}
                <CloseButton onClick={close} size="sm" className="-mt-1 -mr-1" />
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 sm:px-6">
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

                {/*
                 * Errors and results are announced, not just drawn: somebody who
                 * cannot see the panel appear still needs to be told the import
                 * finished, and what it did.
                 */}
                <FormError error={error} arrive />

                {result ? (
                    <output className="flex arrive flex-col gap-1 text-sm">
                        <span className="font-medium text-primary">{plural(result.added, "card")} added to your collection.</span>
                        <span className="text-tertiary">
                            {plural(result.seen, "row")} read.
                            {result.existing > 0 ? ` ${plural(result.existing, "card")} you already had, left alone.` : ""}
                            {result.notOwned > 0 ? ` ${plural(result.notOwned, "card")} you do not own, left alone.` : ""}
                            {result.skipped - result.notOwned > 0 ? ` ${plural(result.skipped - result.notOwned, "row")} could not be read.` : ""}
                        </span>
                    </output>
                ) : null}

                {preview ? (
                    <div className="flex arrive flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <p aria-live="polite" className="text-sm font-medium text-primary">
                                {summary(preview)}
                            </p>
                            <p className="text-sm text-tertiary">
                                {preview.source === "dex"
                                    ? "This is an export from Dex. Its columns, copy counts and printings are already understood."
                                    : "The columns were worked out from the file's first row. Correct any that are wrong."}
                            </p>
                        </div>

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
                                                <td className="py-2 pr-4 text-secondary">
                                                    {row.finish ?? "—"}
                                                    {/*
                                                     * The pattern under the finish, because they are
                                                     * two answers about one copy: what it is worth,
                                                     * and what it looks like. A cosmos holo is a holo.
                                                     */}
                                                    {row.foilPattern ? (
                                                        <span className="block text-xs text-tertiary">{row.foilPattern.replace("-", " ")}</span>
                                                    ) : null}
                                                </td>
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

                        {/*
                         * Only the rows that went wrong get listed, and only when
                         * there are any. A Dex export leaves out thousands of
                         * cards you do not own, and listing those was twenty
                         * identical sentences behind a disclosure — a line number
                         * for something no line number helps with. The sentence
                         * above already says how many. A row with no card name is
                         * the opposite: rare, and the number is the whole point.
                         */}
                        {unreadable.length > 0 ? (
                            <details className="rounded-lg ring-1 ring-secondary ring-inset">
                                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-secondary">
                                    Rows that could not be read ({(preview.skipped - preview.notOwned).toLocaleString("en")})
                                </summary>
                                <ul className="flex flex-col gap-1 px-4 pt-1 pb-4 text-sm text-tertiary">
                                    {unreadable.map((s) => (
                                        <li key={s.line}>
                                            Line {s.line}: {s.why}
                                        </li>
                                    ))}
                                    {preview.skipped - preview.notOwned > unreadable.length ? (
                                        <li>and {(preview.skipped - preview.notOwned - unreadable.length).toLocaleString("en")} more.</li>
                                    ) : null}
                                </ul>
                            </details>
                        ) : null}

                        {/*
                         * Not a choice, a warning. Every row is added, because a
                         * file is a list of copies somebody has and a second copy
                         * is a normal thing to own. But nothing in the database
                         * refuses the same file twice, and there is no undo — so
                         * the number that would say "you are about to do this
                         * again" has to be on screen before the button is.
                         */}
                        {preview.existing > 0 ? (
                            <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary">
                                <span className="font-medium text-primary">{plural(preview.existing, "card")} you already have</span>{" "}
                                {preview.existing === 1 ? "is" : "are"} in this file, and will be added again as extra copies. If you have imported this file
                                before, that is what this number is telling you — there is no undo.
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-secondary px-5 py-4 sm:px-6">
                {result ? (
                    <>
                        <Button size="md" color="secondary" onClick={close}>
                            Close
                        </Button>
                        <LinkButton href="/dashboard/cards" size="md">
                            View your cards
                        </LinkButton>
                    </>
                ) : (
                    <>
                        <Button size="md" color="secondary" onClick={close} isDisabled={busy === "importing"}>
                            Cancel
                        </Button>
                        {preview ? (
                            <Button size="md" isDisabled={writing === 0} isLoading={busy === "importing"} onClick={() => void onImport()}>
                                {writing === 0 ? "Nothing to add" : `Add ${plural(writing, "card")}`}
                            </Button>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
