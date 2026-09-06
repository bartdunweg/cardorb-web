"use client";

import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { markOwnedWith } from "@/app/(app)/dashboard/cards/actions";
import type { FolderChoice } from "@/app/(app)/dashboard/collections/actions";
import { CONDITIONS } from "@/components/app/condition-badge";
import { FlagIcon } from "@/components/app/flag-icon";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Card } from "@/lib/api-shapes";
import type { CopyEdits } from "@/lib/copies";
import { LANGUAGES } from "@/lib/languages";

// A wish becomes a copy you hold. The moment to say what it is: language, condition (Near Mint
// unless said), finish, folder, what you paid and the day you got it (today unless said). One
// save; the wish leaves the wishlist and the sheet closes on it.
type Props = {
    card: Card;
    folders: FolderChoice[];
    onSaved?: () => void;
};

const FINISHES = [
    { label: "Not recorded", value: "" },
    { label: "Normal", value: "normal" },
    { label: "Reverse holo", value: "reverse-holo" },
    { label: "Holo", value: "holo" },
];

const today = () => new Date().toISOString().slice(0, 10);

export function MarkOwnedDialog({ children, ...form }: Props & { children: ReactNode }) {
    return (
        <DialogTrigger>
            {children}
            <ModalOverlay>
                <Modal className="max-w-md">
                    <Dialog>{({ close }) => <MarkOwnedForm {...form} close={close} />}</Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}

function MarkOwnedForm({ card, folders, onSaved, close }: Props & { close: () => void }) {
    const router = useRouter();
    const [language, setLanguage] = useState("en");
    const [condition, setCondition] = useState("Near Mint");
    const [grade, setGrade] = useState("");
    const [finish, setFinish] = useState(card.finish ?? "");
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
            condition: grade.trim() ? null : condition || null,
            grade: grade.trim() || null,
            finish: (finish || null) as CopyEdits["finish"],
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
        router.refresh();
        close();
    };

    const row = "flex items-center justify-between gap-4 text-sm font-medium text-secondary";

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
                    Got it
                </AriaHeading>
                <p className="text-sm text-tertiary">{card.name} leaves your wishlist and joins your collection. Say what the copy is like.</p>
            </div>

            <div className={row}>
                Language
                <span className="flex items-center gap-2">
                    <FlagIcon language={language} size="md" labelled />
                    <NativeSelect
                        aria-label="Language"
                        size="sm"
                        className="w-auto"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        options={LANGUAGES.map((l) => ({ label: l.label, value: l.code }))}
                    />
                </span>
            </div>

            <div className={row}>
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

            <div className={row}>
                Grade
                <Input aria-label="Grade" size="sm" className="w-40" placeholder="PSA 10" value={grade} onChange={setGrade} />
            </div>

            <div className={row}>
                Finish
                <NativeSelect aria-label="Finish" size="sm" className="w-auto" value={finish} onChange={(e) => setFinish(e.target.value)} options={FINISHES} />
            </div>

            <div className={row}>
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

            <div className={row}>
                Purchase price
                <Input type="number" aria-label="Purchase price" size="sm" className="w-28" placeholder="0.00" value={price} onChange={setPrice} />
            </div>

            <div className={row}>
                Got it on
                <Input type="date" aria-label="Got it on" size="sm" className="w-40" value={date} onChange={setDate} />
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
                <Button type="submit" size="sm" isLoading={saving}>
                    Add to collection
                </Button>
            </div>
        </form>
    );
}
