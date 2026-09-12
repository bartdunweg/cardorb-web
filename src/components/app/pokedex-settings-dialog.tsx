"use client";

import { useState } from "react";
import { DotsHorizontal, Settings01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { updateListPublic, updatePokedexSetting } from "@/app/(app)/dashboard/settings/actions";
import { DexRangeFields, dexDraft, dexFromDraft } from "@/components/app/dex-range-fields";
import { FormError } from "@/components/app/form-error";
import { RarityPicker } from "@/components/app/rarity-picker";
import { notify } from "@/components/app/toast";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";
import type { Facets } from "@/lib/cards";
import type { PokedexSetting } from "@/lib/folder-rule";

// The built-in Pokédex's two settings: which Pokémon you collect, and whether the ones you miss
// show. Saved on the profile, so the phone and the desktop agree.
// `compact`: the trigger is a dots button for the phone's bar, across from Back.
export function PokedexSettingsDialog({
    setting,
    isPublic,
    facets,
    facetsLoading,
    compact,
}: {
    setting: PokedexSetting;
    isPublic: boolean;
    facets: Facets;
    /** The facets are the page's own Suspense fallback: no rarities yet, rather than none at all. */
    facetsLoading?: boolean;
    compact?: boolean;
}) {
    const router = useRouter();
    const [missing, setMissing] = useState(setting.missing);
    const [dex, setDex] = useState(dexDraft(setting.dex));
    const [rarities, setRarities] = useState<string[]>(setting.rarities ?? []);
    const [shown, setShown] = useState(isPublic);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async (close: () => void) => {
        setSaving(true);
        setError(null);
        const range = dexFromDraft(dex);
        const res = await updatePokedexSetting({
            missing,
            ...(range ? { dex: range } : {}),
            ...(rarities.length ? { rarities } : {}),
        });
        if (!res.ok) {
            setSaving(false);
            setError(res.error);
            return;
        }
        const changingShown = shown !== isPublic;
        const shownRes = changingShown ? await updateListPublic({ list: "pokedex", shown }) : res;
        setSaving(false);
        if (!shownRes.ok) {
            // Two writes, and the first one has already landed. A bare error here reads as "nothing
            // saved", and the range you just typed would be typed again over the copy that is
            // already stored.
            setError(`The range and rarities were saved. The public profile setting was not: ${shownRes.error}`);
            return;
        }
        close();
        // The grid behind answers for the range and the rarities by redrawing. The public flag
        // shows nowhere but /user/[username], so it is the half that needs saying.
        if (changingShown) notify.done(shown ? "Your Pokédex shows on your public profile now" : "Your Pokédex no longer shows on your public profile");
        router.refresh();
    };

    return (
        <DialogTrigger
            onOpenChange={(open) => {
                if (!open) return;
                setMissing(setting.missing);
                setDex(dexDraft(setting.dex));
                setRarities(setting.rarities ?? []);
                setShown(isPublic);
                setError(null);
            }}
        >
            {compact ? (
                <Button color="secondary" size="lg" iconLeading={DotsHorizontal} aria-label="Pokédex settings" />
            ) : (
                <Button color="secondary" size="md" iconLeading={Settings01} aria-label="Pokédex settings">
                    Settings
                </Button>
            )}
            <ModalOverlay>
                <Modal className="max-w-md">
                    <Dialog>
                        {({ close }) => (
                            <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl glass-thick p-6 shadow-xl">
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    Pokédex settings
                                </AriaHeading>
                                <DexRangeFields label="I collect" anyLabel="Every Pokémon" dex={dex} onChange={setDex} />
                                <Toggle
                                    label="Show the Pokémon I'm missing"
                                    hint="An empty, named slot for each one you have no card of."
                                    isSelected={missing}
                                    onChange={setMissing}
                                />
                                <RarityPicker
                                    label="Rarities that count"
                                    options={facets.rarities}
                                    selected={rarities}
                                    onChange={setRarities}
                                    isLoading={facetsLoading}
                                />
                                <Toggle
                                    label="Show on my public profile"
                                    hint="As a chip beside your binders on your page, drawn the way you see it here. Only while your profile is public."
                                    isSelected={shown}
                                    onChange={setShown}
                                />
                                <FormError error={error} />
                                <div className="flex justify-end gap-2">
                                    <Button color="secondary" onClick={close}>
                                        Cancel
                                    </Button>
                                    <Button onClick={() => save(close)} isLoading={saving}>
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}
