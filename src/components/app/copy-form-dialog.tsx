"use client";

import { type ReactNode, useState } from "react";
import { Minus, Plus } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { addCopy, splitCopy } from "@/app/(app)/dashboard/cards/actions";
import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import type { FolderChoice } from "@/app/(app)/dashboard/collections/actions";
import { CONDITIONS } from "@/components/app/condition-badge";
import { finishOptions, patternOptions, soleOption } from "@/components/app/copy-fields";
import { FormError } from "@/components/app/form-error";
import { GRADERS, GRADES, gradeLabel, splitGrade } from "@/components/app/graded";
import { LanguageSelect } from "@/components/app/language-select";
import { SheetDialog } from "@/components/app/sheet-dialog";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Card } from "@/lib/api-shapes";
import type { CopyEdits } from "@/lib/copies";
import { today } from "@/lib/format";
import { languageOf } from "@/lib/languages";

// A copy that differs from the row it comes from. `add`: one more, pulled today, in the
// language, condition, finish, folder and at the price given. `split`: some of this row's
// copies are like that already; they move to a row of their own and keep the acquired date.
// Prefilled from the row, so only what differs has to be touched; Save waits until something does.
type Props = {
    mode: "add" | "split";
    from: Card;
    folders: FolderChoice[];
    onSaved?: () => void;
    /** The Western languages the card was printed in, when the API has said. */
    languages?: readonly string[] | null;
    /** What the catalogue says this card is, so no impossible printing is offered. */
    facts?: CardFacts | null;
};

export function CopyFormDialog({ children, ...form }: Props & { children: ReactNode }) {
    return (
        <SheetDialog className="sm:max-w-md" content={(close) => <CopyForm {...form} close={close} />}>
            {children}
        </SheetDialog>
    );
}

function CopyForm({ mode, from, folders, languages, facts, onSaved, close }: Props & { close: () => void }) {
    const router = useRouter();
    const total = from.quantity ?? 1;
    const [count, setCount] = useState(1);
    const [language, setLanguage] = useState(languageOf(from.language).code);
    const [condition, setCondition] = useState(from.grade ? "" : (from.condition ?? ""));
    // The one column holds "PSA 10"; the form asks it as two questions and a switch.
    const initialGrade = splitGrade(from.grade);
    const [graded, setGraded] = useState(Boolean((from.grade ?? "").trim()));
    const [grader, setGrader] = useState(initialGrade.grader || GRADERS[0]);
    const [gradeValue, setGradeValue] = useState(initialGrade.grade || GRADES[0]);
    const [finish, setFinish] = useState(from.finish ?? "");
    const [pattern, setPattern] = useState(from.foil_pattern ?? "");
    const [folder, setFolder] = useState(from.collection_id ?? "");
    const [price, setPrice] = useState(from.purchase_price != null ? String(from.purchase_price) : "");
    /* Only asked when adding. A split keeps the row's own date — those copies were already yours,
       they are only being told apart now — and the API is left to say so. */
    const [acquired, setAcquired] = useState(today());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const manual = folders.filter((f) => !f.rule);

    // Only what differs goes over the wire: the row's own values are the copy's by default.
    // A card the catalogue says exists in one finish only is not a question. The row states
    // it and the save records it, which is not a guess — it is the only possibility.
    const finishes = finishOptions(facts, from.finish ?? null);
    const soleFinish = soleOption(finishes);
    const effectiveFinish = finish || soleFinish?.value || "";
    // The pattern list follows the finish: cosmos on a holo is not cosmos on a normal.
    const patterns = patternOptions(facts, effectiveFinish, from.foil_pattern ?? null);
    const solePattern = soleOption(patterns);
    const effectivePattern = pattern || solePattern?.value || "";

    const edits = (): CopyEdits => {
        const out: CopyEdits = {};
        if (language !== languageOf(from.language).code) out.language = language;
        const cond = graded ? null : condition || null;
        if (cond !== (from.condition ?? null)) out.condition = cond;
        const gr = graded ? gradeLabel(grader, gradeValue) : null;
        if (gr !== (from.grade ?? null)) out.grade = gr;
        const fin = (effectiveFinish || null) as CopyEdits["finish"];
        if (fin !== (from.finish ?? null)) out.finish = fin;
        const pat = (effectivePattern || null) as CopyEdits["foilPattern"];
        if (pat !== (from.foil_pattern ?? null)) out.foilPattern = pat;
        if ((folder || null) !== (from.collection_id ?? null)) out.collectionId = folder || null;
        const p = price.trim() === "" ? null : Number(price);
        if (p !== null && !Number.isFinite(p)) return out;
        if (p !== (from.purchase_price ?? null)) out.purchasePrice = p;
        return out;
    };
    const changes = edits();
    const differs = Object.keys(changes).length > 0;
    /* How many this form may claim: anything up to 999 when adding, and all but one of the row
       being split, since a split that leaves nothing behind is a move. */
    const ceiling = mode === "add" ? 999 : Math.max(1, total - 1);
    const canSplit = mode === "add" || (count >= 1 && count < total);

    const save = async () => {
        setSaving(true);
        setError(null);
        // Kept out of `changes`, which decides whether Save is allowed: a date is a fact about
        // getting the card, not a way this copy differs from the row, and today's date standing in
        // the field must not count as a difference by itself.
        const res =
            mode === "add"
                ? await addCopy(from.id, { ...changes, ...(acquired ? { acquiredAt: acquired } : {}) }, count)
                : await splitCopy(from.id, changes, count);
        setSaving(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        onSaved?.();
        router.refresh();
        close();
    };

    // Label above a full-width field, at every width. Side by side was the old shape and it
    // squeezed: this dialog is 448px whatever the screen is, so a viewport breakpoint fixes
    // nothing — a select whose own text runs under its chevron looks broken and is the same
    // on a desktop as on a phone.
    const row = "flex flex-col gap-1.5 text-sm font-medium text-secondary";

    return (
        <form
            className="flex flex-col gap-5 p-5"
            onSubmit={(e) => {
                e.preventDefault();
                void save();
            }}
        >
            <div className="flex flex-col gap-1">
                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                    {mode === "add" ? "Add a different copy" : "One of these copies is different"}
                </AriaHeading>
                <p className="text-sm text-tertiary">
                    {mode === "add"
                        ? `Another ${from.name}, pulled today. Change what differs from this one.`
                        : `Of the ${total} you hold, some are not like the rest. They keep the date you got them.`}
                </p>
            </div>

            {mode === "split" || total > 0 ? (
                <div className={row}>
                    {mode === "add" ? "How many" : `How many of the ${total}`}
                    {/* The same minus, number, plus as the card sheet's Quantity row: one control for
                        one question, wherever it is asked. Typing still works — a number field is
                        faster than nine presses — but the common answer is one or two either way. */}
                    <span className="flex items-center gap-2">
                        <Button
                            color="secondary"
                            size="sm"
                            iconLeading={Minus}
                            aria-label="One fewer"
                            isDisabled={count <= 1}
                            onClick={() => setCount(count - 1)}
                        />
                        <Input
                            type="number"
                            aria-label="How many"
                            size="sm"
                            className="w-16"
                            min={1}
                            max={ceiling}
                            value={String(count)}
                            onChange={(v) => setCount(Math.max(1, Math.min(ceiling, Number(v) || 1)))}
                        />
                        <Button
                            color="secondary"
                            size="sm"
                            iconLeading={Plus}
                            aria-label="One more"
                            isDisabled={count >= ceiling}
                            onClick={() => setCount(count + 1)}
                        />
                    </span>
                </div>
            ) : null}

            <div className={row}>
                Language
                {/*
                 * The flag inside the control, before the word. It cannot go in the list: an
                 * <option> holds text and nothing else, and this stays a native select on
                 * purpose — on a phone that is the operating system's own wheel, which beats
                 * anything drawn here. Emoji flags would fit in the list and were tried; they
                 * are a different picture on every platform and sit badly beside the app's own.
                 */}
                <LanguageSelect value={language} onChange={(code) => setLanguage(code as typeof language)} printed={languages} />
            </div>

            {/*
             * Raw or graded, and then only the question that follows. The rule was always here —
             * every list shows `grade ?? condition`, and the condition select disabled itself the
             * moment a grade was typed — but you found it by bumping into it. A slab has a grade
             * and no condition; a loose card has a condition and no grade.
             */}
            <div className={row}>
                Condition
                <ButtonGroup
                    size="sm"
                    // Its own class is `w-max`, so the row's width has to be given; the halves
                    // then share it. justify-center because the kit's item is `items-center`
                    // and nothing else — stretched, its word sat against the left edge.
                    className="w-full *:flex-1 *:justify-center"
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={new Set([graded ? "graded" : "raw"])}
                    onSelectionChange={(keys) => setGraded([...keys][0] === "graded")}
                >
                    <ButtonGroupItem id="raw">Raw</ButtonGroupItem>
                    <ButtonGroupItem id="graded">Graded</ButtonGroupItem>
                </ButtonGroup>
            </div>

            {graded ? (
                <div className={row}>
                    Grade
                    <span className="flex w-full gap-2">
                        <NativeSelect
                            aria-label="Grading company"
                            size="sm"
                            className="w-full"
                            value={grader}
                            onChange={(e) => setGrader(e.target.value)}
                            options={GRADERS.map((g) => ({ label: g, value: g }))}
                        />
                        <NativeSelect
                            aria-label="Grade"
                            size="sm"
                            className="w-full"
                            value={gradeValue}
                            onChange={(e) => setGradeValue(e.target.value)}
                            options={GRADES.map((g) => ({ label: g, value: g }))}
                        />
                    </span>
                </div>
            ) : (
                <div className={row}>
                    Kept as
                    <NativeSelect
                        aria-label="Condition"
                        size="sm"
                        className="w-full"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        options={[{ label: "Not recorded", value: "" }, ...CONDITIONS.map((c) => ({ label: c, value: c }))]}
                    />
                </div>
            )}

            {soleFinish ? (
                <div className={row}>
                    Finish
                    <span className="text-secondary">{soleFinish.label}</span>
                </div>
            ) : (
                <div className={row}>
                    Finish
                    <NativeSelect
                        aria-label="Finish"
                        size="sm"
                        className="w-full"
                        value={finish}
                        onChange={(e) => setFinish(e.target.value)}
                        options={finishes}
                    />
                </div>
            )}

            {/* A card with no foil at all has no pattern to record — the one thing about a
                pattern any catalogue is certain of. */}
            {solePattern ? (
                <div className={row}>
                    Foil pattern
                    <span className="text-secondary">{solePattern.label}</span>
                </div>
            ) : patterns.length ? (
                <div className={row}>
                    Foil pattern
                    <NativeSelect
                        aria-label="Foil pattern"
                        size="sm"
                        className="w-full"
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                        options={patterns}
                    />
                </div>
            ) : null}

            <div className={row}>
                Folder
                <NativeSelect
                    aria-label="Binder"
                    size="sm"
                    className="w-full"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    options={[{ label: "None", value: "" }, ...manual.map((f) => ({ label: f.name, value: f.id }))]}
                />
            </div>

            <div className={row}>
                Purchase price
                <Input
                    type="number"
                    aria-label="Purchase price"
                    size="sm"
                    className="w-28"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={setPrice}
                />
            </div>

            {mode === "add" ? (
                <div className={row}>
                    Acquired
                    {/* No future days: a card you hold was got in the past. Turned away where it is
                        asked for rather than after the API refuses it. */}
                    <Input
                        type="date"
                        aria-label="Acquired"
                        size="sm"
                        className="w-44"
                        max={today()}
                        value={acquired}
                        onChange={(date) => {
                            if (typeof date === "string" && date > today()) return;
                            setAcquired(typeof date === "string" ? date : "");
                        }}
                    />
                </div>
            ) : null}

            <FormError error={error} />

            <div className="flex justify-end gap-2">
                <Button color="secondary" size="sm" onClick={close}>
                    Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={saving} isDisabled={(mode === "split" && !differs) || !canSplit}>
                    {mode === "add" ? "Add copy" : "Split"}
                </Button>
            </div>
        </form>
    );
}
