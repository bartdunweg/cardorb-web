"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { createCollection, loadFacets, updateCollection } from "@/app/(app)/dashboard/collections/actions";
import { DexRangeFields, dexDraft, dexFromDraft } from "@/components/app/dex-range-fields";
import { FormError } from "@/components/app/form-error";
import { RarityPicker } from "@/components/app/rarity-picker";
import { notify } from "@/components/app/toast";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { BadgeWithButton } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { type Facets, NO_FACETS } from "@/lib/facets";
import { type FolderKind, type FolderRule, type PokedexSetting, ruleSummary } from "@/lib/folder-rule";

type FolderShape = { id: string; name: string; kind: FolderKind; rule: FolderRule | null; pokedex: PokedexSetting | null; isPublic: boolean };
type FormProps = {
    mode: "create" | "edit";
    folder?: FolderShape;
    facets?: Facets;
    /** Told the new folder's id, when the opener wants to use it (the card sheet files the card in it). */
    onSaved?: (id: string | undefined) => void;
};

// One dialog for a folder's name and its rule: New folder (by hand or by rule) and, on the
// folder's page, Rename or Edit rule. A folder keeps its kind, so edit mode never shows the
// choice. The form mounts inside the dialog, so it starts clean on every open: the sidebar's
// New folder lives for the whole session and must not remember the last folder made. The set
// and rarity pickers are a select that appends chips: the kit has no multi-select, and a list of
// chips reads what a rule says better than a scrolling box (R-UI-001). A page that has the
// facets hands them in; the sidebar has none and the form asks for them when it opens.
export function FolderDialog({ children, ...form }: FormProps & { children: ReactNode }) {
    return (
        <DialogTrigger>
            {children}
            <ModalOverlay>
                <FolderModalBody {...form} />
            </ModalOverlay>
        </DialogTrigger>
    );
}

/**
 * The same dialog, opened by something that is not a pressable child — a menu item on the
 * binder's page. The overlay is controlled; DialogTrigger is not in the picture.
 */
export function FolderModal({ isOpen, onOpenChange, ...form }: FormProps & { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <ModalOverlay isOpen={isOpen} onOpenChange={onOpenChange}>
            <FolderModalBody {...form} />
        </ModalOverlay>
    );
}

function FolderModalBody(form: FormProps) {
    return (
        <Modal className="max-w-md">
            <Dialog>{({ close }) => <FolderForm {...form} close={close} />}</Dialog>
        </Modal>
    );
}

function FolderForm({ mode, folder, facets: given, onSaved, close }: FormProps & { close: () => void }) {
    const router = useRouter();
    const [name, setName] = useState(folder?.name ?? "");
    const [kind, setKind] = useState<FolderKind>(folder?.kind ?? "manual");
    const [dex, setDex] = useState(dexDraft(folder?.rule?.dex));
    // Shown as a Pokédex: any folder may be; the setting has its own range, which may differ from a rule's.
    const [asPokedex, setAsPokedex] = useState(!!folder?.pokedex);
    const [missing, setMissing] = useState(folder?.pokedex?.missing ?? true);
    const [dexShown, setDexShown] = useState(dexDraft(folder?.pokedex?.dex));
    const [dexRarities, setDexRarities] = useState<string[]>(folder?.pokedex?.rarities ?? []);
    const [isPublic, setIsPublic] = useState(folder?.isPublic ?? false);
    const [sets, setSets] = useState<string[]>(folder?.rule?.sets ?? []);
    const [rarities, setRarities] = useState<string[]>(folder?.rule?.rarities ?? []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<Facets | null>(given ?? null);
    useEffect(() => {
        if (!given) loadFacets().then(setLoaded);
    }, [given]);
    const facets = loaded ?? NO_FACETS;

    const rule = (): FolderRule | undefined => {
        if (kind !== "rule") return undefined;
        const out: FolderRule = {};
        const range = dexFromDraft(dex);
        if (range) out.dex = range;
        if (sets.length) out.sets = sets;
        if (rarities.length) out.rarities = rarities;
        return out;
    };
    const preview = rule();
    const pokedex = (): PokedexSetting | null => {
        if (!asPokedex) return null;
        const range = dexFromDraft(dexShown);
        return {
            missing,
            ...(range ? { dex: range } : {}),
            ...(dexRarities.length ? { rarities: dexRarities } : {}),
        };
    };

    const save = async (close: () => void) => {
        setSaving(true);
        setError(null);
        const res =
            mode === "create"
                ? await createCollection(name, rule(), pokedex() ?? undefined, isPublic)
                : await updateCollection(folder!.id, { name, ...(kind === "rule" ? { rule: rule() } : {}), pokedex: pokedex(), isPublic });
        setSaving(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        close();
        // A new rule folder is worth seeing filled; a renamed one is where it was. An opener that
        // asked for the id stays where it is and gets it.
        if (onSaved) {
            // No toast: the opener puts the new binder in front of you — the card sheet's select
            // switches to it the moment this returns.
            onSaved(res.id);
            router.refresh();
        } else if (mode === "create" && kind === "rule" && res.id) {
            // No toast either: the page you land on, filled, is the answer.
            router.push(`/dashboard/collections/${res.id}`);
        } else {
            // Nothing here moves. A new binder joins a list you are not looking at, and a rename
            // swaps one word in a header that is easy to miss.
            notify.done(
                mode === "create" ? `${name} is in your Binders now` : folder!.name !== name ? `This binder is called ${name} now` : `${name} is saved`,
            );
            router.refresh();
        }
    };

    const title = mode === "create" ? "New binder" : kind === "rule" ? "Edit rule" : "Edit binder";
    // A rule names a set by its official name (the API matches either); a rule written before
    // 2026-09-11 may carry the name the card was filed under, and reads as the title all the same.
    const setOptions = facets.sets.filter((s) => !sets.includes(s.title) && !sets.includes(s.name));
    const rarityOptions = facets.rarities.filter((r) => !rarities.includes(r));
    const titleOf = (name: string) => facets.sets.find((s) => s.name === name || s.title === name)?.title ?? name;

    return (
        <div className="flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl glass-thick p-6 shadow-xl">
            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                {title}
            </AriaHeading>
            <Input label="Name" value={name} onChange={setName} placeholder={kind === "rule" ? "e.g. Kanto" : "e.g. Charizards"} />

            {mode === "create" ? (
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-secondary">Filled</span>
                    <ButtonGroup
                        aria-label="How the folder fills"
                        selectionMode="single"
                        disallowEmptySelection
                        selectedKeys={new Set([kind])}
                        onSelectionChange={(keys) => {
                            const key = [...keys][0];
                            if (key === "manual" || key === "rule") setKind(key);
                        }}
                    >
                        <ButtonGroupItem id="manual">By hand</ButtonGroupItem>
                        <ButtonGroupItem id="rule">By rule</ButtonGroupItem>
                    </ButtonGroup>
                </div>
            ) : null}

            {kind === "rule" ? (
                <>
                    <DexRangeFields label="Pokédex" anyLabel="Any Pokémon" dex={dex} onChange={setDex} />

                    <div className="flex flex-col gap-1.5">
                        <NativeSelect
                            label="Sets"
                            value=""
                            onChange={(event) => {
                                if (event.target.value) setSets((s) => [...s, event.target.value]);
                            }}
                            options={[
                                { label: !loaded ? "Loading sets…" : sets.length ? "Add another set" : "Any set", value: "" },
                                ...setOptions.map((s) => ({ label: s.title, value: s.title })),
                            ]}
                        />
                        {sets.length ? (
                            <div className="flex flex-wrap gap-1.5">
                                {sets.map((s) => (
                                    <BadgeWithButton
                                        key={s}
                                        size="md"
                                        color="gray"
                                        type="pill-color"
                                        buttonLabel={`Remove ${titleOf(s)}`}
                                        onButtonClick={() => setSets((all) => all.filter((x) => x !== s))}
                                    >
                                        {titleOf(s)}
                                    </BadgeWithButton>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <NativeSelect
                            label="Rarities"
                            value=""
                            onChange={(event) => {
                                if (event.target.value) setRarities((r) => [...r, event.target.value]);
                            }}
                            options={[
                                { label: !loaded ? "Loading rarities…" : rarities.length ? "Add another rarity" : "Any rarity", value: "" },
                                ...rarityOptions.map((r) => ({ label: r, value: r })),
                            ]}
                        />
                        {rarities.length ? (
                            <div className="flex flex-wrap gap-1.5">
                                {rarities.map((r) => (
                                    <BadgeWithButton
                                        key={r}
                                        size="md"
                                        color="gray"
                                        type="pill-color"
                                        buttonLabel={`Remove ${r}`}
                                        onButtonClick={() => setRarities((all) => all.filter((x) => x !== r))}
                                    >
                                        {r}
                                    </BadgeWithButton>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <p className="text-sm text-tertiary" aria-live="polite">
                        {preview && (preview.dex || preview.sets || preview.rarities)
                            ? `Shows ${ruleSummary(preview, facets)}.`
                            : "Add a Pokédex range, a set or a rarity."}{" "}
                        Owned cards only.
                    </p>
                </>
            ) : null}

            <Toggle label="Show as Pokédex" hint="One slot per Pokémon, in the national order." isSelected={asPokedex} onChange={setAsPokedex} />
            {asPokedex ? (
                <>
                    <DexRangeFields label="Pokédex range" anyLabel="Every Pokémon" dex={dexShown} onChange={setDexShown} />
                    <Toggle label="Show the Pokémon I'm missing" isSelected={missing} onChange={setMissing} />
                    <RarityPicker label="Rarities that count" options={facets.rarities} selected={dexRarities} onChange={setDexRarities} />
                </>
            ) : null}
            <Toggle
                label="Show on my public profile"
                hint="Visitors can narrow your public cards to it, while your profile is public."
                isSelected={isPublic}
                onChange={setIsPublic}
            />
            <FormError error={error} />
            <div className="flex justify-end gap-2">
                <Button color="secondary" onClick={close}>
                    Cancel
                </Button>
                <Button onClick={() => save(close)} isLoading={saving}>
                    {mode === "create" ? "Create" : "Save"}
                </Button>
            </div>
        </div>
    );
}
