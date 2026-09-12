"use client";

import { type ReactNode, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { type ColumnMap, type ImportPreview, type ImportResult, commitImport, previewImport } from "@/app/(app)/dashboard/settings/import-actions";
import { FormError } from "@/components/app/form-error";
import { LinkButton } from "@/components/app/link-button";
import { FileUploadDropZone, FileUploadList, FileUploadListItem, type FileUploadStatus } from "@/components/application/file-upload/file-upload-base";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Progress, type Step } from "@/components/application/progress-steps/progress-steps";
import { Table, TableCard } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { MAX_CSV_BYTES, readCsv } from "@/lib/csv-file";
import { cx } from "@/utils/cx";

/**
 * Choosing a file, seeing what it would do, and then doing it.
 *
 * The shape of this is one rule: an import cannot be undone, so nothing is
 * written until somebody has been shown, in numbers and in words, what writing
 * would mean. The button is not called Import, it says how many cards it is
 * about to add, and it does not exist until there is a preview.
 *
 * Three steps, one file. Upload is the drop zone; the moment a file is chosen
 * it appears under the zone as a row that names it and spins while it is read,
 * and that row is then the one thing carried through all three steps: on
 * Review the drop zone is gone and the row keeps the file above the preview
 * and the button that writes, on Done it stands above the figures as what was
 * imported. Every CSV import on Mobbin (Attio, Remote, Resend, Podia,
 * Pipedrive) is built this way, and the reason is the same one as ours: a drop
 * zone that stays on screen next to a preview offers a second file while you
 * are still deciding about the first, and a spinner with no file name beside
 * it does not say what it is waiting for.
 *
 * A dialog rather than a page. An import is one errand you finish and leave,
 * not a place in the app: it has no address worth sharing, nothing links to it,
 * and coming back to Settings afterwards is the whole of "done". The kit's
 * modal is react-aria, so the focus trap, Escape and returning focus to the
 * button that opened it are already right (R-UI-001). On a phone it fills the
 * screen, because the preview is a table and half a screen of table is worse
 * than none.
 *
 * The form mounts inside the dialog, so it starts clean on every open, the
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
function summary(p: ImportPreview, writing: number): string {
    const writable = p.seen - p.skipped;
    const parts = [
        writing === writable
            ? `${plural(writing, "card")} will be added.`
            : `${plural(writing, "card")} will be added, of ${writable.toLocaleString("en")} in the file.`,
    ];
    /*
     * Three things used to be one word, "skipped", and each rewording of it was
     * still wrong until somebody looked at what those rows actually are.
     *
     * They are not cards you do not own. In a real 4,536-row export every one
     * of the 2,440 was another *printing* of a card its owner does have: an
     * Espeon he holds as Normal also arrives as Reverse Holo, National
     * Championships and National Championships (Staff), each at zero. So the
     * sentence names the printing, not the card, and says where they came
     * from, because "2,439 cards you do not own" is a number that makes a
     * person ask where those came from, and the answer should not be a
     * conversation.
     */
    if (p.notOwned > 0) {
        parts.push(
            p.source === "dex"
                ? `Dex also lists ${plural(p.notOwned, "printing")} you do not have. Those are left alone.`
                : `${plural(p.notOwned, "row")} the file marks as not owned, left alone.`,
        );
    }
    const unreadable = p.skipped - p.notOwned;
    if (unreadable > 0) parts.push(`${plural(unreadable, "row")} could not be read.`);
    return parts.join(" ");
}

/**
 * The reckoning on Done: every row the file held, in the column it ended up in.
 *
 * "Rows read" and "Added" are always there, because they are the two numbers
 * somebody came for. The other three are only drawn when they are not zero: a
 * column of zeroes reads as a list of things that went wrong, and none of them
 * did.
 */
const figures = (r: ImportResult): { label: string; value: number; alarming?: boolean }[] => {
    const unreadable = r.skipped - r.notOwned;
    return [
        { label: "Rows read", value: r.seen },
        { label: "Added", value: r.added },
        ...(r.excluded > 0 ? [{ label: "Left out by you", value: r.excluded }] : []),
        ...(r.existing > 0 ? [{ label: "Already had", value: r.existing }] : []),
        ...(r.notOwned > 0 ? [{ label: "Not owned", value: r.notOwned }] : []),
        ...(unreadable > 0 ? [{ label: "Could not be read", value: unreadable, alarming: true }] : []),
    ];
};

/** How many rows the list draws at once. A Dex export has thousands; a screen has none. */
const PAGE = 100;

type StepName = "upload" | "review" | "done";

const STEPS: { name: StepName; title: string }[] = [
    { name: "upload", title: "Upload" },
    { name: "review", title: "Review" },
    { name: "done", title: "Done" },
];

const steps = (current: StepName): Step[] => {
    const at = STEPS.findIndex((s) => s.name === current);
    return STEPS.map((s, i) => ({ title: s.title, status: i < at ? "complete" : i === at ? "current" : "incomplete" }));
};

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

    const [file, setFile] = useState<{ name: string; size: number } | null>(null);
    const [csv, setCsv] = useState<string | null>(null);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [map, setMap] = useState<ColumnMap>({});
    const [header, setHeader] = useState<string[]>([]);
    const [busy, setBusy] = useState<"reading" | "importing" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    /**
     * Rows struck off, by the line of the file they came from.
     *
     * The lines rather than the rows: the list is redrawn from a fresh preview
     * every time a column changes, and a line number means the same thing
     * across that where a position in an array does not. Empty is everything
     * ticked, which is what a file somebody chose to import should start as.
     */
    const [excluded, setExcluded] = useState<ReadonlySet<number>>(new Set());
    const [shown, setShown] = useState(PAGE);
    /** Narrows the list to the rows whose card or set matches. Never narrows what is imported. */
    const [query, setQuery] = useState("");

    /*
     * Which step is on screen is read off the state rather than kept beside
     * it, so the two cannot disagree. A preview, or a header handed back with
     * the columns question, is Review; a result is Done; anything else is
     * Upload, including a file that could not be read, whose error belongs
     * next to the drop zone that will take the next one.
     */
    const step: StepName = result ? "done" : preview || header.length > 0 ? "review" : "upload";

    const reset = () => {
        setPreview(null);
        setResult(null);
        setError(null);
        setMap({});
        setHeader([]);
        setExcluded(new Set());
        setShown(PAGE);
        setQuery("");
    };

    /** Back to the drop zone, with nothing of the last file left behind. */
    const startOver = () => {
        reset();
        setFile(null);
        setCsv(null);
    };

    /*
     * Every action here answers `{ ok: false }` for anything it saw coming, so
     * an actual throw is the case nobody wrote a sentence for: the request that
     * never reached the action at all. That is not hypothetical: a 1.4 MB file
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
            // A re-read under a different column map is a different list, with
            // different lines in it. Carrying the old ticking over would strike
            // off rows nobody looked at.
            setExcluded(new Set());
            setShown(PAGE);
            setQuery("");
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
        const picked = files[0];
        if (!picked) return;

        void guard(async () => {
            reset();
            setFile({ name: picked.name, size: picked.size });
            setBusy("reading");
            const read = readCsv(await picked.arrayBuffer());
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
            const outcome = await commitImport({
                csv,
                map: Object.keys(map).length ? map : undefined,
                exclude: excluded.size ? [...excluded] : undefined,
            });
            setBusy(null);

            if (!outcome.ok) {
                setError(outcome.error);
                return;
            }
            setResult(outcome.result);
            // The collection this just wrote to is read through a cache the write
            // dropped; without this the cards page would show yesterday's count.
            router.refresh();
        }, "Something went wrong, and the import may or may not have finished. Close this, reload, and check your cards before trying again.");

    /*
     * What the row under the drop zone says.
     *
     * Reading covers both awaits, the file itself and the preview the API
     * answers with, because to the person waiting those are one wait. The two
     * unhappy endings are kept apart on purpose: a file that came back with its
     * header and a question about its columns is not a broken file, and putting
     * a red ring round it says the opposite of what the form underneath is
     * asking. Red is only for a file nothing could be made of. And a file with
     * unreadable rows in it is neither: those rows are counted, not fatal.
     */
    const fileStatus: FileUploadStatus = busy !== null ? "busy" : !error ? "ready" : header.length > 0 ? "attention" : "failed";
    const fileStatusLabel =
        busy === "reading"
            ? "Reading…"
            : busy === "importing"
              ? "Importing…"
              : fileStatus === "failed"
                ? "Could not be read"
                : fileStatus === "attention"
                  ? "Needs its columns"
                  : result
                    ? "Imported"
                    : "Ready to import";

    /**
     * The rows on offer, and what is left ticked.
     *
     * `rows` is empty against an API that does not hand the list back yet, and
     * then nothing here can be struck off: `writing` falls back to the count
     * the preview reported, which is what this screen always used.
     */
    const rows = preview?.rows ?? [];
    const writing = preview ? (rows.length > 0 ? rows.length - excluded.size : preview.seen - preview.skipped) : 0;

    /*
     * What the list shows, which is never what the import writes. A search
     * narrows the rows on screen and nothing else: a row filtered out of sight
     * keeps its tick, because typing a word is how somebody looks for a card,
     * not how they say what to leave behind.
     */
    const needle = query.trim().toLowerCase();
    const listed = needle ? rows.filter((r) => `${r.name} ${r.setName}`.toLowerCase().includes(needle)) : rows;

    // The tick at the top of the list acts on the list: what a search narrowed
    // it to, drawn or still behind the button.
    const pickedInList = listed.filter((r) => !excluded.has(r.line)).length;
    const somePicked = pickedInList > 0;
    const allPicked = listed.length > 0 && pickedInList === listed.length;

    /** Rows naming a card the collection already holds, and how many are still ticked. */
    const alreadyHeld = rows.filter((r) => r.existing);
    const heldStillPicked = alreadyHeld.filter((r) => !excluded.has(r.line)).length;

    const toggle = (line: number) => {
        const next = new Set(excluded);
        if (!next.delete(line)) next.add(line);
        setExcluded(next);
    };

    /** Every row in the list at once, which is the only bulk action worth having. */
    const pickAll = (pick: boolean) => {
        const next = new Set(excluded);
        for (const row of listed) {
            if (pick) next.delete(row.line);
            else next.add(row.line);
        }
        setExcluded(next);
    };

    // The sample the API sends holds the first twenty skipped rows, mixed; only
    // the ones that actually failed are worth a line number.
    const unreadable = preview ? preview.skippedRows.filter((s) => !s.why.startsWith("not owned")) : [];

    return (
        // A column with one scrolling middle: the title and the steps stay put,
        // and so does the button that does the irreversible thing. On a long
        // preview the alternative is scrolling back up to find out what you
        // agreed to.
        //
        // The height is stated rather than inherited. max-h-full on the kit's
        // Modal measures against an overlay that scrolls, so the dialog grew
        // past a 560px-tall window and put the Add button off the bottom of the
        // screen, the one control that must never be out of sight. The numbers
        // are the overlay's own padding, p-4 and sm:p-8.
        <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-xl bg-primary shadow-lg ring-1 ring-secondary max-sm:h-dvh max-sm:max-h-dvh max-sm:rounded-none sm:max-h-[calc(100dvh-4rem)]">
            <div className="flex flex-col gap-5 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
                <div className="flex items-start justify-between gap-4">
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
                <Progress.IconsWithText items={steps(step)} size="sm" />
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 sm:px-6">
                {step === "upload" ? (
                    <FileUploadDropZone
                        accept=".csv,text/csv,text/plain"
                        allowsMultiple={false}
                        maxSize={MAX_CSV_BYTES}
                        hint="CSV, up to 2 MB. UTF-8 or UTF-16, commas or semicolons, all fine."
                        isDisabled={busy !== null}
                        onDropFiles={onPick}
                        onDropUnacceptedFiles={() => setError("That is not a CSV file.")}
                        onSizeLimitExceed={() => setError("That file is too large. The limit is 2 MB.")}
                    />
                ) : null}

                {/*
                 * The file you chose, on every step, in the same row. A 4,500-row
                 * export takes a couple of seconds to read, and a spinner floating
                 * under the drop zone did not say what it was busy with: the file's
                 * name was nowhere on screen until Review. Now the row arrives with
                 * the file, spins while it is read, and stays afterwards as what
                 * this import is about.
                 */}
                {file ? (
                    <FileUploadList>
                        <FileUploadListItem
                            name={file.name}
                            size={file.size}
                            status={fileStatus}
                            statusLabel={fileStatusLabel}
                            onRemove={busy === null && step !== "done" ? startOver : undefined}
                            removeLabel="Choose another file"
                        />
                    </FileUploadList>
                ) : null}

                {/*
                 * Errors and results are announced, not just drawn: somebody who
                 * cannot see the panel appear still needs to be told the import
                 * finished, and what it did.
                 */}
                <FormError error={error} arrive />

                {result ? (
                    <output className="flex arrive flex-col gap-4">
                        <p className="text-sm font-medium text-primary">{plural(result.added, "card")} added to your collection.</p>
                        {/*
                         * The figures, once the writing is done. The preview above
                         * deliberately says its numbers in a sentence, because there
                         * the question is "what will this do" and arithmetic is in
                         * the way of an answer. Here the question is the other one,
                         * "what did it do", and that is a reckoning: four numbers
                         * that add up, side by side, so a file that went half wrong
                         * can be seen to have gone half wrong.
                         */}
                        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {figures(result).map((figure) => (
                                <div key={figure.label} className="flex flex-col gap-0.5 rounded-lg px-4 py-3 ring-1 ring-secondary ring-inset">
                                    <dt className="text-xs text-tertiary">{figure.label}</dt>
                                    <dd className={cx("text-lg font-semibold tabular-nums", figure.alarming ? "text-error-primary" : "text-primary")}>
                                        {figure.value.toLocaleString("en")}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        {/*
                         * The collection's own size, which is the number the
                         * figures above cannot give: "1,204 added" is not
                         * checkable on its own, and "it says 1,204 and I have
                         * 1,600" is the question an import leaves behind.
                         */}
                        {typeof result.total === "number" ? (
                            <p className="text-sm text-tertiary">Your collection holds {plural(result.total, "card")} now.</p>
                        ) : null}
                    </output>
                ) : null}

                {step === "review" && preview ? (
                    <div className="flex arrive flex-col gap-4">
                        <div className="flex flex-col gap-1">
                            <p aria-live="polite" className="text-sm font-medium text-primary">
                                {summary(preview, writing)}
                            </p>
                            <p className="text-sm text-tertiary">
                                {preview.source === "dex"
                                    ? "This is an export from Dex. Its columns, copy counts and printings are already understood."
                                    : "The columns were worked out from the file's first row. Correct any that are wrong."}
                            </p>
                        </div>

                        {/*
                         * The kit's table, as the collection's list view uses it
                         * (R-UI-001), with a tick in front of every row.
                         *
                         * Every row is ticked when the list arrives, because a file
                         * somebody chose to import is a file they mean to import;
                         * the ticks are there to take a row out, not to build the
                         * import up one row at a time.
                         *
                         * Not every row is drawn. A Dex export is four and a half
                         * thousand lines and two thousand of them would be written:
                         * laying that many rows out costs seconds and scrolls past
                         * anything worth reading. A hundred at a time, more on the
                         * button, and the ticking is kept by line number rather than
                         * by what is on screen, so a row you never scrolled to is
                         * still part of the import.
                         */}
                        {/*
                         * The two things a list of two thousand rows needs: a way
                         * to find one, and a way to deal with the ones that are
                         * already in the collection. The search narrows what is
                         * drawn and never what is written; the button is the only
                         * answer to "93 of these you already have" that does not
                         * end in scrolling.
                         */}
                        {rows.length > 0 ? (
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <Input
                                    size="sm"
                                    icon={SearchLg}
                                    label="Find a card in this file"
                                    placeholder="Card or set"
                                    value={query}
                                    onChange={(value) => {
                                        setQuery(value);
                                        setShown(PAGE);
                                    }}
                                    className="w-full sm:w-72"
                                />
                                {heldStillPicked > 0 ? (
                                    <Button size="sm" color="secondary" onClick={() => setExcluded(new Set([...excluded, ...alreadyHeld.map((r) => r.line)]))}>
                                        Untick the {heldStillPicked.toLocaleString("en")} you already have
                                    </Button>
                                ) : null}
                            </div>
                        ) : null}

                        {needle ? (
                            <p aria-live="polite" className="text-sm text-tertiary">
                                {listed.length === 0
                                    ? `No card in this file matches "${query.trim()}".`
                                    : `${plural(listed.length, "row")} of ${rows.length.toLocaleString("en")} shown. The rest keep their ticks.`}
                            </p>
                        ) : null}

                        {listed.length > 0 ? (
                            <TableCard.Root size="sm">
                                <Table aria-label="The cards this import would add">
                                    <Table.Header>
                                        {/*
                                         * The ticks stay put when the table is
                                         * scrolled sideways, which on a phone it
                                         * always is: a row whose tick is off the
                                         * screen is a row you cannot take out.
                                         */}
                                        <Table.Head id="pick" label="" className="sticky left-0 z-10 w-10 bg-secondary">
                                            <Checkbox
                                                // The kit's table hands a CheckboxContext down for
                                                // react-aria's own row selection, which these are not:
                                                // the ticking is ours, kept by line number. Opting out
                                                // of the slot is how a checkbox says so.
                                                slot={null}
                                                // Named for what it is, not for what clicking it
                                                // would do: a checkbox already announces its state,
                                                // and a name that flips with it is read out as a
                                                // contradiction ("Leave every row out, checked").
                                                // "This list" rather than "the file": with a search
                                                // on, it acts on what the search left, which is what
                                                // somebody who just typed a word means by all.
                                                aria-label="Import every row in this list"
                                                isSelected={somePicked}
                                                isIndeterminate={somePicked && !allPicked}
                                                onChange={() => pickAll(!allPicked)}
                                            />
                                        </Table.Head>
                                        <Table.Head id="card" label="Card" isRowHeader />
                                        <Table.Head id="set" label="Set" />
                                        <Table.Head id="number" label="Number" />
                                        <Table.Head id="printing" label="Printing" />
                                        <Table.Head id="copies" label="Copies" />
                                        <Table.Head id="where" label="Where" />
                                    </Table.Header>
                                    <Table.Body items={listed.slice(0, shown).map((row) => ({ ...row, id: String(row.line) }))}>
                                        {(row) => (
                                            <Table.Row id={row.id}>
                                                <Table.Cell className="sticky left-0 z-10 bg-primary">
                                                    <Checkbox
                                                        slot={null}
                                                        // Named by the card, not by "row 12": the
                                                        // name is what somebody is deciding about.
                                                        aria-label={`Import ${row.name}, ${row.setName}`}
                                                        isSelected={!excluded.has(row.line)}
                                                        onChange={() => toggle(row.line)}
                                                    />
                                                </Table.Cell>
                                                <Table.Cell className="font-medium text-primary">
                                                    {row.name}
                                                    {/*
                                                     * Said in words under the name, not marked in a
                                                     * colour: it is the one thing on this screen
                                                     * somebody might act on row by row, and a tint
                                                     * nobody can see is not a warning (R-A11Y-001).
                                                     */}
                                                    {row.existing ? (
                                                        <span className="block text-xs font-normal text-tertiary">You already have this</span>
                                                    ) : null}
                                                </Table.Cell>
                                                <Table.Cell>{row.setName}</Table.Cell>
                                                <Table.Cell>{row.number || "—"}</Table.Cell>
                                                <Table.Cell>
                                                    {row.finish ?? "—"}
                                                    {/*
                                                     * The pattern under the finish, because they are
                                                     * two answers about one copy: what it is worth,
                                                     * and what it looks like. A cosmos holo is a holo.
                                                     */}
                                                    {row.foilPattern ? (
                                                        <span className="block text-xs text-tertiary">{row.foilPattern.replace("-", " ")}</span>
                                                    ) : null}
                                                </Table.Cell>
                                                <Table.Cell className="tabular-nums">{row.quantity ?? 1}</Table.Cell>
                                                <Table.Cell>{row.owned ? "Collection" : "Wishlist"}</Table.Cell>
                                            </Table.Row>
                                        )}
                                    </Table.Body>
                                </Table>
                            </TableCard.Root>
                        ) : preview.sample.length > 0 ? (
                            /*
                             * The old sample table, for an API that does not hand
                             * back the whole list yet. Twenty rows, no ticks, which
                             * is what this screen showed before and still true.
                             */
                            <TableCard.Root size="sm">
                                <Table aria-label={`The first ${preview.sample.length} cards this import would add`}>
                                    <Table.Header>
                                        <Table.Head id="card" label="Card" isRowHeader />
                                        <Table.Head id="set" label="Set" />
                                        <Table.Head id="number" label="Number" />
                                        <Table.Head id="printing" label="Printing" />
                                        <Table.Head id="copies" label="Copies" />
                                        <Table.Head id="where" label="Where" />
                                    </Table.Header>
                                    <Table.Body items={preview.sample.map((row, i) => ({ ...row, id: `${row.setName}-${row.number}-${row.name}-${i}` }))}>
                                        {(row) => (
                                            <Table.Row id={row.id}>
                                                <Table.Cell className="font-medium text-primary">{row.name}</Table.Cell>
                                                <Table.Cell>{row.setName}</Table.Cell>
                                                <Table.Cell>{row.number || "—"}</Table.Cell>
                                                <Table.Cell>
                                                    {row.finish ?? "—"}
                                                    {row.foilPattern ? (
                                                        <span className="block text-xs text-tertiary">{row.foilPattern.replace("-", " ")}</span>
                                                    ) : null}
                                                </Table.Cell>
                                                <Table.Cell className="tabular-nums">{row.quantity ?? 1}</Table.Cell>
                                                <Table.Cell>{row.owned ? "Collection" : "Wishlist"}</Table.Cell>
                                            </Table.Row>
                                        )}
                                    </Table.Body>
                                </Table>
                            </TableCard.Root>
                        ) : null}

                        {listed.length > shown ? (
                            <Button size="sm" color="secondary" onClick={() => setShown((n) => n + PAGE)} className="self-start">
                                {listed.length - shown <= PAGE
                                    ? `Show the last ${plural(listed.length - shown, "row")}`
                                    : `Show ${PAGE.toLocaleString("en")} more of the ${(listed.length - shown).toLocaleString("en")} left`}
                            </Button>
                        ) : null}
                        {rows.length === 0 && writing > preview.sample.length ? (
                            <p className="text-sm text-tertiary">And {plural(writing - preview.sample.length, "more card")}.</p>
                        ) : null}
                    </div>
                ) : null}

                {step === "review" && preview?.source !== "dex" && header.length > 0 ? (
                    <details className="rounded-lg ring-1 ring-secondary ring-inset" open={!preview}>
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
                 * identical sentences behind a disclosure, a line number
                 * for something no line number helps with. The sentence
                 * above already says how many. A row with no card name is
                 * the opposite: rare, and the number is the whole point.
                 */}
                {preview && unreadable.length > 0 ? (
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
                 * refuses the same file twice, and there is no undo, so
                 * the number that would say "you are about to do this
                 * again" has to be on screen before the button is.
                 */}
                {step === "review" && preview && preview.existing > 0 ? (
                    <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary">
                        <span className="font-medium text-primary">{plural(preview.existing, "card")} you already have</span>{" "}
                        {preview.existing === 1 ? "is" : "are"} in this file, and will be added again as extra copies. If you have imported this file before,
                        that is what this number is telling you. There is no undo.
                    </p>
                ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-secondary px-5 py-4 sm:px-6">
                {step === "done" ? (
                    <>
                        <Button size="md" color="secondary" onClick={close}>
                            Close
                        </Button>
                        <LinkButton href="/dashboard/cards" size="md">
                            View your cards
                        </LinkButton>
                    </>
                ) : step === "review" ? (
                    <>
                        <Button size="md" color="secondary" onClick={startOver} isDisabled={busy !== null}>
                            Back
                        </Button>
                        <Button
                            size="md"
                            isDisabled={!preview || writing === 0 || busy === "reading"}
                            isLoading={busy === "importing"}
                            onClick={() => void onImport()}
                        >
                            {preview && writing === 0 ? "Nothing to add" : `Add ${plural(writing, "card")}`}
                        </Button>
                    </>
                ) : (
                    <Button size="md" color="secondary" onClick={close} isDisabled={busy !== null}>
                        Cancel
                    </Button>
                )}
            </div>
        </div>
    );
}
