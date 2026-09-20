"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { createBinder, updateBinder } from "@/app/(app)/dashboard/collections/actions";
import { BINDER_FORM_FRAME, type BinderFormProps as FormProps } from "@/components/app/binder-dialog";
import { DexRangeFields, dexDraft, dexFromDraft } from "@/components/app/dex-range-fields";
import { FormError } from "@/components/app/form-error";
import { RarityPicker } from "@/components/app/rarity-picker";
import { notify } from "@/components/app/toast";
import { BadgeWithButton } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { type BinderKind, type BinderRule, type PokedexSetting, ruleSummary } from "@/lib/binder-rule";
import { type Facets, NO_FACETS } from "@/lib/facets";
import { forgetMineQuietly } from "@/lib/forget-mine";
import { loadFacets } from "@/lib/reads";

/*
 * The form inside the binder dialog (binder-dialog.tsx), in a module of its own: the dialog loads it
 * the first time it opens, so the sidebar's New binder, on every page, does not bring the pickers,
 * the kit's inputs and the binder actions with it. The dialog is already here when this loads, so
 * what the two share (the frame, the props) is read from it.
 */

export function BinderForm({ mode, binder, facets: given, onSaved, close }: FormProps & { close: () => void }) {
    const router = useRouter();
    const [typed, setTyped] = useState(binder?.name ?? "");
    const [kind, setKind] = useState<BinderKind>(binder?.kind ?? "manual");
    const [dex, setDex] = useState(dexDraft(binder?.rule?.dex));
    // Shown as a Pokédex: any binder may be; the setting has its own range, which may differ from a rule's.
    const [asPokedex, setAsPokedex] = useState(!!binder?.pokedex);
    const [missing, setMissing] = useState(binder?.pokedex?.missing ?? true);
    const [dexShown, setDexShown] = useState(dexDraft(binder?.pokedex?.dex));
    const [dexRarities, setDexRarities] = useState<string[]>(binder?.pokedex?.rarities ?? []);
    const [isPublic, setIsPublic] = useState(binder?.isPublic ?? false);
    const [sets, setSets] = useState<string[]>(binder?.rule?.sets ?? []);
    const [rarities, setRarities] = useState<string[]>(binder?.rule?.rarities ?? []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<Facets | null>(given ?? null);
    useEffect(() => {
        if (!given) loadFacets().then(setLoaded);
    }, [given]);
    const facets = loaded ?? NO_FACETS;

    const rule = (): BinderRule | undefined => {
        if (kind !== "rule") return undefined;
        const out: BinderRule = {};
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

    /* The dialog waits for the write, because the API is what says a name is taken and what hands
       back a new binder's id, and a form closed before that answer loses what was typed into it.
       It no longer waits for the redraw: the button spun on while the whole page was drawn inside
       the action's answer, and the refresh after it drew the page a second time. Now the write
       forgets nothing itself, the cache is dropped quietly and the page is drawn once. */
    const save = async (close: () => void) => {
        // As it is kept: "  Kanto " is saved and named as "Kanto", in the toasts too.
        const name = typed.trim();
        setSaving(true);
        setError(null);
        const res =
            mode === "create"
                ? await createBinder(name, rule(), pokedex() ?? undefined, isPublic, { reread: false }).catch(() => ({
                      ok: false as const,
                      error: "Something went wrong. Try again.",
                  }))
                : await updateBinder(binder!.id, { name, ...(kind === "rule" ? { rule: rule() } : {}), pokedex: pokedex(), isPublic }, { reread: false }).catch(
                      () => ({ ok: false as const, error: "Something went wrong. Try again." }),
                  );
        setSaving(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
        close();
        const forgotten = forgetMineQuietly("binders");
        // A new rule binder is worth seeing filled; a renamed one is where it was. An opener that
        // asked for the id stays where it is and gets it.
        if (onSaved) {
            // No toast: the opener puts the new binder in front of you; the card sheet's select
            // switches to it the moment this returns.
            onSaved(res.id);
            void forgotten.then(() => router.refresh());
        } else if (mode === "create" && kind === "rule" && res.id) {
            // No toast either: the page you land on, filled, is the answer. After the cache is gone,
            // or the binder's page reads the list of binders from before it existed.
            const id = res.id;
            void forgotten.then(() => router.push(`/dashboard/collections/${id}`));
        } else {
            // Nothing here moves. A new binder joins a list you are not looking at, and a rename
            // swaps one word in a header that is easy to miss.
            notify.done(
                mode === "create" ? `${name} is in your Binders now` : binder!.name !== name ? `This binder is called ${name} now` : `${name} is saved`,
            );
            void forgotten.then(() => router.refresh());
        }
    };

    const title = mode === "create" ? "New binder" : kind === "rule" ? "Edit rule" : "Edit binder";
    // A rule names a set by its official name (the API matches either); a rule written before
    // 2026-09-11 may carry the name the card was filed under, and reads as the title all the same.
    const setOptions = facets.sets.filter((s) => !sets.includes(s.title) && !sets.includes(s.name));
    const rarityOptions = facets.rarities.filter((r) => !rarities.includes(r));
    const titleOf = (name: string) => facets.sets.find((s) => s.name === name || s.title === name)?.title ?? name;

    return (
        <div className={BINDER_FORM_FRAME}>
            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                {title}
            </AriaHeading>
            <Input label="Name" value={typed} onChange={setTyped} placeholder={kind === "rule" ? "e.g. Kanto" : "e.g. Charizards"} />

            {mode === "create" ? (
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-secondary">Filled</span>
                    <ButtonGroup
                        aria-label="How the binder fills"
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
                            isLoading={!loaded}
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
                            isLoading={!loaded}
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
                    <Toggle label="Show the Pokémon I’m missing" isSelected={missing} onChange={setMissing} />
                    <RarityPicker label="Rarities that count" options={facets.rarities} selected={dexRarities} onChange={setDexRarities} isLoading={!loaded} />
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
