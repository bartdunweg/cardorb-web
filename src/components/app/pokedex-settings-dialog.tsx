"use client";

import { useState } from "react";
import { Settings01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { updateListPublic, updatePokedexSetting } from "@/app/(app)/dashboard/settings/actions";
import { DexRangeFields, dexDraft, dexFromDraft } from "@/components/app/dex-range-fields";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { DEX_KINDS, type DexKind, type PokedexSetting, dexKindOf, withDexKind } from "@/lib/folder-rule";

// The built-in Pokédex's two settings: which Pokémon you collect, and whether the ones you miss
// show. Saved on the profile, so the phone and the desktop agree.
export function PokedexSettingsDialog({ setting, isPublic }: { setting: PokedexSetting; isPublic: boolean }) {
    const router = useRouter();
    const [missing, setMissing] = useState(setting.missing);
    const [dex, setDex] = useState(dexDraft(setting.dex));
    const [kind, setKind] = useState<DexKind>(dexKindOf(setting));
    const [shown, setShown] = useState(isPublic);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async (close: () => void) => {
        setSaving(true);
        setError(null);
        const range = dexFromDraft(dex);
        const res = await updatePokedexSetting(withDexKind({ missing, ...(range ? { dex: range } : {}) }, kind));
        const shownRes = res.ok && shown !== isPublic ? await updateListPublic({ list: "pokedex", shown }) : res;
        setSaving(false);
        if (!shownRes.ok) {
            setError(shownRes.error);
            return;
        }
        if (!res.ok) {
            setError(res.error);
            return;
        }
        close();
        router.refresh();
    };

    return (
        <DialogTrigger>
            <Button color="secondary" iconLeading={Settings01}>
                Pokédex settings
            </Button>
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
                                <NativeSelect
                                    label="Cards that count"
                                    hint={DEX_KINDS.find((k) => k.id === kind)?.hint}
                                    value={kind}
                                    onChange={(event) => setKind(event.target.value as DexKind)}
                                    options={DEX_KINDS.map((k) => ({ label: k.label, value: k.id }))}
                                />
                                <Toggle
                                    label="Show on my public profile"
                                    hint="As a tab on your page, drawn the way you see it here. Only while your profile is public."
                                    isSelected={shown}
                                    onChange={setShown}
                                />
                                {error ? (
                                    <p role="alert" className="text-sm text-error-primary">
                                        {error}
                                    </p>
                                ) : null}
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
