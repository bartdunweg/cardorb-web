"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { addCopy, splitCopy } from "@/app/(app)/dashboard/cards/actions";
import type { FolderChoice } from "@/app/(app)/dashboard/collections/actions";
import { CONDITIONS } from "@/components/app/condition-badge";
import { FlagIcon } from "@/components/app/flag-icon";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Card } from "@/lib/api-shapes";
import type { CopyEdits } from "@/lib/copies";
import { languageOf, languagesFor } from "@/lib/languages";

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
};

const FINISHES = [
    { label: "Not recorded", value: "" },
    { label: "Normal", value: "normal" },
    { label: "Reverse holo", value: "reverse-holo" },
    { label: "Holo", value: "holo" },
];

export function CopyFormDialog({ children, ...form }: Props & { children: ReactNode }) {
    return (
        <DialogTrigger>
            {children}
            <ModalOverlay>
                <Modal className="max-w-md">
                    <Dialog>{({ close }) => <CopyForm {...form} close={close} />}</Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}

function CopyForm({ mode, from, folders, languages, onSaved, close }: Props & { close: () => void }) {
    const router = useRouter();
    const total = from.quantity ?? 1;
    const [count, setCount] = useState(1);
    const [language, setLanguage] = useState(languageOf(from.language).code);
    const [condition, setCondition] = useState(from.grade ? "" : (from.condition ?? ""));
    const [grade, setGrade] = useState(from.grade ?? "");
    const [finish, setFinish] = useState(from.finish ?? "");
    const [folder, setFolder] = useState(from.collection_id ?? "");
    const [price, setPrice] = useState(from.purchase_price != null ? String(from.purchase_price) : "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const manual = folders.filter((f) => !f.rule);

    // Only what differs goes over the wire: the row's own values are the copy's by default.
    const edits = (): CopyEdits => {
        const out: CopyEdits = {};
        if (language !== languageOf(from.language).code) out.language = language;
        const cond = grade.trim() ? null : condition || null;
        if (cond !== (from.condition ?? null)) out.condition = cond;
        const gr = grade.trim() || null;
        if (gr !== (from.grade ?? null)) out.grade = gr;
        const fin = (finish || null) as CopyEdits["finish"];
        if (fin !== (from.finish ?? null)) out.finish = fin;
        if ((folder || null) !== (from.collection_id ?? null)) out.collectionId = folder || null;
        const p = price.trim() === "" ? null : Number(price);
        if (p !== null && !Number.isFinite(p)) return out;
        if (p !== (from.purchase_price ?? null)) out.purchasePrice = p;
        return out;
    };
    const changes = edits();
    const differs = Object.keys(changes).length > 0;
    const canSplit = mode === "add" || (count >= 1 && count < total);

    const save = async () => {
        setSaving(true);
        setError(null);
        const res = mode === "add" ? await addCopy(from.id, changes, count) : await splitCopy(from.id, changes, count);
        setSaving(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        onSaved?.();
        router.refresh();
        close();
    };

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
                <div className="flex items-center justify-between gap-4 text-sm font-medium text-secondary">
                    {mode === "add" ? "How many" : `How many of the ${total}`}
                    <Input
                        type="number"
                        aria-label="How many"
                        size="sm"
                        className="w-24"
                        value={String(count)}
                        onChange={(v) => setCount(Math.max(1, Math.min(mode === "add" ? 999 : total - 1, Number(v) || 1)))}
                    />
                </div>
            ) : null}

            <div className="flex items-center justify-between gap-4 text-sm font-medium text-secondary">
                Language
                <span className="flex items-center gap-2">
                    <FlagIcon language={language} size="md" labelled />
                    <NativeSelect
                        aria-label="Language"
                        size="sm"
                        className="w-auto"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as typeof language)}
                        options={languagesFor(null, languages).map((l) => ({ label: l.label, value: l.code }))}
                    />
                </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm font-medium text-secondary">
                Condition
                <NativeSelect
                    aria-label="Condition"
                    size="sm"
                    className="w-auto"
                    value={condition}
                    disabled={grade.trim() !== ""}
                    onChange={(e) => setCondition(e.target.value)}
                    options={[{ label: "Not recorded", value: "" }, ...CONDITIONS.map((c) => ({ label: c, value: c }))]}
                />
            </div>

            {/* A graded copy has a grade and no condition: the slab says which it is. */}
            <div className="flex items-center justify-between gap-4 text-sm font-medium text-secondary">
                Grade
                <Input aria-label="Grade" size="sm" className="w-40" placeholder="PSA 10" value={grade} onChange={setGrade} />
            </div>

            <div className="flex items-center justify-between gap-4 text-sm font-medium text-secondary">
                Finish
                <NativeSelect aria-label="Finish" size="sm" className="w-auto" value={finish} onChange={(e) => setFinish(e.target.value)} options={FINISHES} />
            </div>

            <div className="flex items-center justify-between gap-4 text-sm font-medium text-secondary">
                Folder
                <NativeSelect
                    aria-label="Folder"
                    size="sm"
                    className="w-auto max-w-48"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    options={[{ label: "None", value: "" }, ...manual.map((f) => ({ label: f.name, value: f.id }))]}
                />
            </div>

            <div className="flex items-center justify-between gap-4 text-sm font-medium text-secondary">
                Purchase price
                <Input type="number" aria-label="Purchase price" size="sm" className="w-28" placeholder="0.00" value={price} onChange={setPrice} />
            </div>

            {error ? (
                <p role="alert" className="text-sm text-error-primary">
                    {error}
                </p>
            ) : null}

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
