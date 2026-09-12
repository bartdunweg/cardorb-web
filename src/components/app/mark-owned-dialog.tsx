"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { markOwnedWith } from "@/app/(app)/dashboard/cards/actions";
import type { CardFacts } from "@/app/(app)/dashboard/cards/actions";
import type { FolderChoice } from "@/app/(app)/dashboard/collections/actions";
import { AcquiredDatePicker } from "@/components/app/acquired-date-picker";
import { CardImage } from "@/components/app/card-image";
import { CONDITIONS } from "@/components/app/condition-badge";
import { editionOptions, finishOptions, patternOptions, soleOption } from "@/components/app/copy-fields";
import { FormError } from "@/components/app/form-error";
import { GRADERS, GRADES, gradeLabel, gradeUnder, gradesFor, splitGrade } from "@/components/app/graded";
import { LanguageSelect } from "@/components/app/language-select";
import { SheetDialog } from "@/components/app/sheet-dialog";
import { notify } from "@/components/app/toast";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Card } from "@/lib/api-shapes";
import { cardLabel } from "@/lib/card-label";
import type { CopyEdits } from "@/lib/copies";
import { today } from "@/lib/format";

// A wish becomes a copy you hold. The moment to say what it is: language, condition (Near Mint
// unless said), finish, folder, what you paid and the day you got it (today unless said). One
// save; the wish leaves the wishlist and the sheet closes on it.
/** What the form reads of a card: a wishlist row, or a set tile's wish, which knows less. */
export type OwnableCard = Pick<
    Card,
    "id" | "name" | "image_url" | "set_name" | "set_abbr" | "number" | "grade" | "finish" | "foil_pattern" | "edition" | "tcg_id"
>;

type Props = {
    card: OwnableCard;
    folders: FolderChoice[];
    onSaved?: () => void;
    /** The Western languages the card was printed in, when the API has said. */
    /** What the catalogue says this card is, so no impossible printing is offered. */
    facts?: CardFacts | null;
    languages?: readonly string[] | null;
};

export function MarkOwnedDialog({ children, ...form }: Props & { children: ReactNode }) {
    return (
        <SheetDialog className="sm:max-w-md" content={(close) => <MarkOwnedForm {...form} close={close} />}>
            {children}
        </SheetDialog>
    );
}

function MarkOwnedForm({ card, folders, languages, facts, onSaved, close }: Props & { close: () => void }) {
    const router = useRouter();
    const [language, setLanguage] = useState("en");
    const [condition, setCondition] = useState("Near Mint");
    // The one column holds "PSA 10"; the form asks it as two questions and a switch.
    const initialGrade = splitGrade(card.grade);
    const [graded, setGraded] = useState(Boolean((card.grade ?? "").trim()));
    const [grader, setGrader] = useState(initialGrade.grader || GRADERS[0]);
    const [gradeValue, setGradeValue] = useState(initialGrade.grade || GRADES[0]);
    const [finish, setFinish] = useState(card.finish ?? "");
    const [pattern, setPattern] = useState(card.foil_pattern ?? "");
    const [edition, setEdition] = useState(card.edition ?? "");
    const [folder, setFolder] = useState("");
    const [price, setPrice] = useState("");
    const [date, setDate] = useState(today());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const manual = folders.filter((f) => !f.rule);

    const save = async () => {
        setSaving(true);
        setError(null);
        const edits: CopyEdits = {
            language,
            condition: graded ? null : condition || null,
            grade: graded ? gradeLabel(grader, gradeValue) : null,
            finish: (effectiveFinish || null) as CopyEdits["finish"],
            foilPattern: (effectivePattern || null) as CopyEdits["foilPattern"],
            edition: (edition || null) as CopyEdits["edition"],
            collectionId: folder || null,
            purchasePrice: price.trim() === "" ? null : Number(price),
            acquiredAt: date || today(),
        };
        const res = await markOwnedWith(card.id, edits);
        setSaving(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        onSaved?.();
        // This form and the sheet behind it both close, so the card is gone from the screen a
        // moment after the save; where it went (off the wishlist, into the Collection) is on a
        // page the user is not on.
        notify.done(`${card.name} is in your collection now`);
        router.refresh();
        close();
    };

    // Label above a full-width field, at every width. Side by side was the old shape and it
    // squeezed: this dialog is 448px whatever the screen is, so a viewport breakpoint fixes
    // nothing: a select whose own text runs under its chevron looks broken and is the same
    // on a desktop as on a phone.
    const row = "flex flex-col gap-1.5 text-sm font-medium text-secondary";

    // A card the catalogue says exists in one finish only is not a question. The row states
    // it and the save records it, which is not a guess: it is the only possibility.
    const finishes = finishOptions(facts, card.finish ?? null);
    const soleFinish = soleOption(finishes);
    const effectiveFinish = finish || soleFinish?.value || "";
    // The pattern list follows the finish: cosmos on a holo is not cosmos on a normal.
    const patterns = patternOptions(facts, effectiveFinish, card.foil_pattern ?? null);
    const solePattern = soleOption(patterns);
    const effectivePattern = pattern || solePattern?.value || "";
    /* Which run, asked here too. The card's own sheet and the add form have asked it since #313
       and this dialog did not, so a 1st Edition Base Set card taken off the wishlist had to be
       opened again to say so. Asked only of a card that had more than one run
       (cardorb-api#342). */
    const editions = editionOptions(facts, card.edition ?? null, language);

    return (
        <form
            className="flex flex-col gap-5 p-5"
            onSubmit={(e) => {
                e.preventDefault();
                void save();
            }}
        >
            {/*
             * The card, not the transaction. "Got it" named the moment and buried what you are
             * looking at in a sentence below it, which is the wrong way round on a form that asks
             * you to describe a copy: the scan and the set are how you check you have the right
             * one in your hand before you answer anything.
             */}
            <div className="flex items-center gap-3">
                {card.image_url ? (
                    // The box sizes the picture, not the class on it: CardImage fills its parent
                    // by design, and says so. rounded-card is the corner a real card has, and it
                    // is what every other place this app draws one uses.
                    <div className="aspect-card w-14 shrink-0 overflow-hidden rounded-card">
                        <CardImage src={card.image_url} alt="" width={112} />
                    </div>
                ) : null}
                <div className="flex min-w-0 flex-col gap-0.5">
                    <AriaHeading slot="title" className="truncate text-lg font-semibold text-primary">
                        {card.name}
                    </AriaHeading>
                    <p className="truncate text-sm text-tertiary">{cardLabel(card, "lg")}</p>
                </div>
            </div>
            <p className="-mt-2 text-sm text-tertiary">Say what your copy is like. It leaves the wishlist and joins your collection.</p>

            <div className={row}>
                Language
                {/*
                 * The flag inside the control, before the word. It cannot go in the list: an
                 * <option> holds text and nothing else, and this stays a native select on
                 * purpose; on a phone that is the operating system's own wheel, which beats
                 * anything drawn here. Emoji flags would fit in the list and were tried; they
                 * are a different picture on every platform and sit badly beside the app's own.
                 */}
                <LanguageSelect value={language} onChange={setLanguage} printed={languages} />
            </div>

            {/*
             * Raw or graded, and then only the question that follows. The rule was always here
             * (every list shows `grade ?? condition`, and the condition select disabled itself the
             * moment a grade was typed), but you found it by bumping into it. A slab has a grade
             * and no condition; a loose card has a condition and no grade.
             */}
            <div className={row}>
                Condition
                <ButtonGroup
                    size="sm"
                    // Its own class is `w-max`, so the row's width has to be given; the halves
                    // then share it. justify-center because the kit's item is `items-center`
                    // and nothing else; stretched, its word sat against the left edge.
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
                            onChange={(e) => {
                                setGrader(e.target.value);
                                // The scales differ: PSA gives no 9.5, so switching to it keeps 9.
                                setGradeValue(gradeUnder(e.target.value, gradeValue));
                            }}
                            options={GRADERS.map((g) => ({ label: g, value: g }))}
                        />
                        <NativeSelect
                            aria-label="Grade"
                            size="sm"
                            className="w-full"
                            value={gradeValue}
                            onChange={(e) => setGradeValue(e.target.value)}
                            options={gradesFor(grader).map((g) => ({ label: g, value: g }))}
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
            {/* A card with no foil at all has no pattern to record, the one thing about a
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

            {editions.length ? (
                <div className={row}>
                    Edition
                    <NativeSelect
                        aria-label="Edition"
                        size="sm"
                        className="w-full"
                        value={edition}
                        onChange={(e) => setEdition(e.target.value)}
                        options={editions}
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

            <div className={row}>
                Got it on
                <AcquiredDatePicker aria-label="Got it on" className="w-full" value={date} onChange={setDate} />
            </div>

            <FormError error={error} />

            <div className="flex justify-end gap-2">
                <Button color="secondary" size="sm" onClick={close}>
                    Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={saving}>
                    Add to collection
                </Button>
            </div>
        </form>
    );
}
