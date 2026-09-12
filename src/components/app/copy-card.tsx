"use client";

import { useState } from "react";
import { Minus, Plus } from "@untitledui/icons";
import { type CardFacts, editCopies } from "@/app/(app)/dashboard/cards/actions";
import type { FolderChoice } from "@/app/(app)/dashboard/collections/actions";
import { AcquiredDatePicker } from "@/components/app/acquired-date-picker";
import { CONDITIONS } from "@/components/app/condition-badge";
import { editionOptions, finishOptions, patternOptions, soleOption } from "@/components/app/copy-fields";
import { FlagIcon } from "@/components/app/flag-icon";
import { FolderDialog } from "@/components/app/folder-dialog";
import { GRADERS, GRADES, gradeLabel, gradeUnder, gradesFor, splitGrade } from "@/components/app/graded";
import { LanguageSelect } from "@/components/app/language-select";
import { notify } from "@/components/app/toast";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { type CopyEdits, type CopyGroup, copyLabel } from "@/lib/copies";
import { formatPrice } from "@/lib/format";
import { languageOf } from "@/lib/languages";
import { cx } from "@/utils/cx";

/**
 * Ours: one kind of copy you hold of a card (Holo · Near Mint, say) as a card of its own in the
 * sheet's Copies tab, with how many of it there are and every fact about it the add form asks
 * for, in the add form's order and shape: a label above a full-width field.
 *
 * It used to be a line in a list and a form under the list that edited whichever line was pressed.
 * That said the same number twice (×4 on the line, Quantity 4 below), asked half of the form's
 * questions and answered the other half as read-only text, and with one kind was a list of one
 * with a bin on it. A card per kind says each thing once, where the form already taught you to
 * look for it.
 *
 * Each field saves the moment it changes, to every row behind the kind: four identical copies
 * are four rows in the store, and "these are Near Mint" is said about all four. The count is the
 * sheet's to change, since taking one away may mean removing a row and the sheet owns the undo.
 */
export function CopyCard({
    group,
    folders,
    languages,
    facts,
    busy,
    arrive = false,
    onMore,
    onFewer,
    onRemove,
    onSaved,
    refreshFolders,
}: {
    group: CopyGroup;
    folders: FolderChoice[];
    /** The Western languages the card was printed in, when the API has said. */
    languages?: readonly string[] | null;
    /** What the catalogue says this card is, so no impossible printing is offered. */
    facts?: CardFacts | null;
    busy: boolean;
    /** Drawn as arriving: the kinds the sheet learns about after it opened on one of them. */
    arrive?: boolean;
    onMore: () => void;
    onFewer: () => void;
    /** Every copy of this kind, at once. */
    onRemove: () => void;
    /** After a field saved, so the sheet re-reads its rows. */
    onSaved: () => void;
    /** The binders again after one was made, so the new one can be picked. */
    refreshFolders: () => Promise<FolderChoice[]>;
}) {
    const row = group.shown;
    const manual = folders.filter((f) => !f.rule);
    const folderName = folders.find((f) => f.id === row.collection_id)?.name ?? null;

    /* What the card shows while a save is on its way, over what the row says. A failed save
       takes the override off and the row's own value is back; a saved one is re-read into the
       row and the two agree. Kept with the row it was set for, so a re-grouped kind starts clean.

       Nothing is disabled while it flies. The card used to grey out whole for the round trip,
       which took the focus off the select you had just used and made the next field wait for
       the last one's save; what you set is shown at once, and a failure takes it back. */
    const [over, setOver] = useState<{ id: string; edits: CopyEdits }>({ id: row.id, edits: {} });
    const shown = over.id === row.id ? over.edits : {};

    const save = async (edits: CopyEdits, failed: string) => {
        setOver((o) => ({ id: row.id, edits: { ...(o.id === row.id ? o.edits : {}), ...edits } }));
        const res = await editCopies(
            group.rows.map((r) => r.id),
            edits,
        );
        if (!res.ok) {
            notify.failed(failed, { description: res.error });
            setOver((o) => {
                const kept = { ...(o.id === row.id ? o.edits : {}) };
                for (const k of Object.keys(edits) as (keyof CopyEdits)[]) delete kept[k];
                return { id: row.id, edits: kept };
            });
            return;
        }
        onSaved();
    };

    const language = shown.language !== undefined ? (shown.language ?? "en") : languageOf(row.language).code;
    const grade = shown.grade !== undefined ? shown.grade : (row.grade ?? null);
    const condition = shown.condition !== undefined ? (shown.condition ?? "") : (row.condition ?? "");
    const graded = Boolean((grade ?? "").trim());
    const { grader, grade: gradeValue } = splitGrade(grade);
    const finish = shown.finish !== undefined ? (shown.finish ?? "") : (row.finish ?? "");
    const pattern = shown.foilPattern !== undefined ? (shown.foilPattern ?? "") : (row.foil_pattern ?? "");
    const folder = shown.collectionId !== undefined ? (shown.collectionId ?? "") : (row.collection_id ?? "");
    const purchasePrice = shown.purchasePrice !== undefined ? shown.purchasePrice : (row.purchase_price ?? null);
    const acquired = shown.acquiredAt !== undefined ? shown.acquiredAt : row.acquired_at ? row.acquired_at.slice(0, 10) : "";

    // The same lists as the add form, with the catalogue as their limit and the recorded value kept.
    const finishes = finishOptions(facts, row.finish ?? null);
    const soleFinish = soleOption(finishes);
    const effectiveFinish = finish || soleFinish?.value || "";
    const patterns = patternOptions(facts, effectiveFinish, row.foil_pattern ?? null);
    const solePattern = soleOption(patterns);
    const edition = shown.edition !== undefined ? (shown.edition ?? "") : (row.edition ?? "");
    const editions = editionOptions(facts, row.edition ?? null, language);
    /* The ordinary price beside the run that has its own, so the two can be read against each
       other. The ordinary one is `price` on a row whose edition says nothing, which is every row
       until somebody says otherwise; where a run is recorded the row already shows that run's.
       Only the stamped run: Shadowless had a figure from Cardmarket and has none from TCGplayer yet. */
    const runPrices: [string, number][] = row.price_first_ed != null ? [["1st Edition", row.price_first_ed]] : [];

    /* The price field is typed into, so it saves when it is left, not on every keystroke. */
    const [priceDraft, setPriceDraft] = useState<string | null>(null);
    const priceText = priceDraft ?? (purchasePrice != null ? String(purchasePrice) : "");
    const commitPrice = () => {
        if (priceDraft === null) return;
        const p = priceDraft.trim() === "" ? null : Number(priceDraft);
        setPriceDraft(null);
        if (p !== null && (!Number.isFinite(p) || p < 0)) return;
        if (p === purchasePrice) return;
        void save({ purchasePrice: p }, "The purchase price did not save");
    };

    const disabled = busy;
    // Label above a full-width field, the add form's shape: the two ask the same questions.
    const field = "flex flex-col gap-1.5 text-sm font-medium text-secondary";

    return (
        <section
            aria-label={copyLabel(row, folderName)}
            className={cx("flex flex-col gap-5 rounded-xl bg-primary p-4 shadow-lift-xs ring-1 ring-primary ring-inset", arrive && "arrive")}
        >
            {/* What kind this is, in the words the add form uses. Not how many: the stepper under it
                says that, and a number said twice in one card is the card arguing with itself. */}
            <header className="flex items-center gap-2">
                <FlagIcon language={row.language} />
                <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">{copyLabel(row, folderName)}</h3>
            </header>

            <div className={field}>
                How many
                <span className="flex items-center gap-2">
                    <Button
                        color="secondary"
                        size="sm"
                        iconLeading={Minus}
                        aria-label={group.quantity <= 1 ? "Remove this copy" : "One copy fewer"}
                        isDisabled={disabled}
                        onClick={onFewer}
                    />
                    <span className="min-w-6 text-center text-primary tabular-nums">{group.quantity}</span>
                    <Button color="secondary" size="sm" iconLeading={Plus} aria-label="One copy more" isDisabled={disabled} onClick={onMore} />
                </span>
            </div>

            <div className={field}>
                Language
                <LanguageSelect value={language} onChange={(code) => void save({ language: code }, "The language did not change")} printed={languages} />
            </div>

            {/* Raw or graded, then only the question that follows: a slab has a grade and no
                condition, a loose card the other way round. Graded starts on the form's own
                defaults, so the switch is one press and the two selects refine it. */}
            <div className={field}>
                Condition
                <ButtonGroup
                    aria-label="Condition"
                    size="sm"
                    className="w-full *:flex-1 *:justify-center"
                    selectionMode="single"
                    disallowEmptySelection
                    isDisabled={disabled}
                    selectedKeys={new Set([graded ? "graded" : "raw"])}
                    onSelectionChange={(keys) => {
                        const next = [...keys][0] === "graded";
                        if (next === graded) return;
                        void save(next ? { grade: gradeLabel(GRADERS[0], GRADES[0]), condition: null } : { grade: null }, "The condition did not change");
                    }}
                >
                    <ButtonGroupItem id="raw">Raw</ButtonGroupItem>
                    <ButtonGroupItem id="graded">Graded</ButtonGroupItem>
                </ButtonGroup>
            </div>

            {graded ? (
                <div className={field}>
                    Grade
                    <span className="flex w-full gap-2">
                        <NativeSelect
                            aria-label="Grading company"
                            size="sm"
                            className="w-full"
                            disabled={disabled}
                            value={grader}
                            /* The grade travels with the company, because the scales differ: PSA
                               gives no 9.5, so a BGS 9.5 slab switched to PSA is saved as PSA 9
                               rather than as a grade that company does not award. */
                            onChange={(e) =>
                                void save({ grade: gradeLabel(e.target.value, gradeUnder(e.target.value, gradeValue)) }, "The grade did not change")
                            }
                            options={GRADERS.map((g) => ({ label: g, value: g }))}
                        />
                        <NativeSelect
                            aria-label="Grade"
                            size="sm"
                            className="w-full"
                            disabled={disabled}
                            value={gradeValue}
                            onChange={(e) => void save({ grade: gradeLabel(grader, e.target.value) }, "The grade did not change")}
                            options={gradesFor(grader).map((g) => ({ label: g, value: g }))}
                        />
                    </span>
                </div>
            ) : (
                <div className={field}>
                    Kept as
                    <NativeSelect
                        aria-label="Condition"
                        size="sm"
                        className="w-full"
                        disabled={disabled}
                        value={condition}
                        onChange={(e) => void save({ condition: e.target.value || null }, "The condition did not change")}
                        options={[{ label: "Not recorded", value: "" }, ...CONDITIONS.map((c) => ({ label: c, value: c }))]}
                    />
                </div>
            )}

            {soleFinish ? (
                <div className={field}>
                    Finish
                    <span className="text-secondary">{soleFinish.label}</span>
                </div>
            ) : (
                <div className={field}>
                    Finish
                    <NativeSelect
                        aria-label="Finish"
                        size="sm"
                        className="w-full"
                        disabled={disabled}
                        value={finish}
                        onChange={(e) => {
                            const next = (e.target.value || null) as CopyEdits["finish"];
                            // The pattern list follows the finish; one the new finish never had goes.
                            const offered = patternOptions(facts, e.target.value, null);
                            const keep = pattern && offered.some((o) => o.value === pattern);
                            void save({ finish: next, ...(keep ? {} : { foilPattern: null }) }, "The finish did not change");
                        }}
                        options={finishes}
                    />
                </div>
            )}

            {solePattern ? (
                <div className={field}>
                    Foil pattern
                    <span className="text-secondary">{solePattern.label}</span>
                </div>
            ) : patterns.length ? (
                <div className={field}>
                    Foil pattern
                    <NativeSelect
                        aria-label="Foil pattern"
                        size="sm"
                        className="w-full"
                        disabled={disabled}
                        value={pattern}
                        onChange={(e) => void save({ foilPattern: (e.target.value || null) as CopyEdits["foilPattern"] }, "The foil pattern did not change")}
                        options={patterns}
                    />
                </div>
            ) : null}

            {/* Asked only where the catalogue says a stamped run of this card exists, or says
                nothing at all. A card printed once has no run to choose. */}
            {editions.length ? (
                <div className={field}>
                    Edition
                    <NativeSelect
                        aria-label="Edition"
                        size="sm"
                        className="w-full"
                        disabled={disabled}
                        value={edition}
                        onChange={(e) => void save({ edition: (e.target.value || null) as CopyEdits["edition"] }, "The edition did not change")}
                        options={editions}
                    />
                </div>
            ) : null}

            {/* What the runs are worth, beside the question. A person holding a classic cannot tell
                from the card alone whether checking for the stamp is worth the trouble; a Jungle
                Clefable at €38 unlimited and €96 stamped answers that, and one where both figures
                are the same answers it the other way. Only where a run is priced at all: on Base
                Set nothing prices the stamp, and on a modern card there is no run. */}
            {editions.length && runPrices.length ? (
                <p className="px-3 pb-2 text-xs text-tertiary">{runPrices.map(([label, amount]) => `${label} ${formatPrice(amount)}`).join(" · ")}</p>
            ) : null}

            {/* Only a binder filled by hand takes a card; a rule binder fills itself. With none
                yet, the way to file it is to make one, and that stays offered beside the list. */}
            <div className={field}>
                Binder
                <span className="flex w-full items-center gap-2">
                    {manual.length ? (
                        <NativeSelect
                            aria-label="Binder"
                            size="sm"
                            className="w-full"
                            disabled={disabled}
                            value={folder}
                            onChange={(e) => void save({ collectionId: e.target.value || null }, "That copy was not filed")}
                            options={[{ label: "None", value: "" }, ...manual.map((f) => ({ label: f.name, value: f.id }))]}
                        />
                    ) : null}
                    <FolderDialog
                        mode="create"
                        onSaved={async (id) => {
                            const next = await refreshFolders();
                            if (id && next.some((f) => f.id === id && !f.rule)) void save({ collectionId: id }, "That copy was not filed");
                        }}
                    >
                        <Button size="sm" color="link-gray" iconLeading={Plus} className="shrink-0">
                            New binder
                        </Button>
                    </FolderDialog>
                </span>
            </div>

            <div className={field}>
                Purchase price
                <Input
                    type="number"
                    aria-label="Purchase price"
                    size="sm"
                    className="w-28"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    isDisabled={disabled}
                    value={priceText}
                    onChange={setPriceDraft}
                    onBlur={commitPrice}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") commitPrice();
                    }}
                />
            </div>

            <div className={field}>
                Acquired
                {/* Saves when Apply is pressed in the calendar, like every other field here saves
                    when it is left. */}
                <AcquiredDatePicker
                    className="w-44"
                    isDisabled={disabled}
                    value={acquired}
                    onChange={(date) => void save({ acquiredAt: date }, "The acquired date did not save")}
                />
            </div>

            {/* The whole kind at once. The minus takes one; this is for four you sold together. */}
            <div className="flex justify-end border-t border-secondary pt-3">
                <Button size="sm" color="link-destructive" isDisabled={disabled} onClick={onRemove}>
                    {group.quantity > 1 ? `Remove all ${group.quantity}` : "Remove this copy"}
                </Button>
            </div>
        </section>
    );
}
