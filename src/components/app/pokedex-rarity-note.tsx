"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCollection } from "@/app/(app)/dashboard/collections/actions";
import { notify } from "@/components/app/toast";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { type PokedexSetting, rarityLabel } from "@/lib/folder-rule";

/**
 * What a binder shown as a Pokédex is counting, where it counts less than everything: the rarities
 * its setting names, and the word that a card of any other rarity leaves its slot grey.
 *
 * The setting lives two taps deep, under Edit binder, and a grey slot said two things at once:
 * "you hold no card of it" and "you hold one, in a rarity that does not count". A person who set
 * the rarities months ago reads the first and goes looking for a card they already own.
 *
 * Nothing is drawn while every rarity counts, which is the default: a line saying "everything
 * counts" is a line about nothing.
 */
export function PokedexRarityNote({ folderId, setting }: { folderId: string; setting: PokedexSetting }) {
    const router = useRouter();
    const [clearing, setClearing] = useState(false);
    const rarities = setting.rarities ?? [];
    if (rarities.length === 0) return null;

    const countAll = async () => {
        setClearing(true);
        const res = await updateCollection(folderId, { pokedex: { missing: setting.missing, ...(setting.dex ? { dex: setting.dex } : {}) } });
        setClearing(false);
        if (!res.ok) {
            notify.failed(res.error);
            return;
        }
        // The button this was pressed on is gone the moment the page redraws, and with it the focus
        // it held: without a word, a keyboard starts over at the top and a screen reader hears
        // nothing at all. The toast is the live region that says what happened.
        notify.done("Every rarity counts now");
        router.refresh();
    };

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-tertiary">
                Only these rarities count. A card you own in any other rarity leaves its Pokémon grey, as though you had none.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
                <ul className="flex flex-wrap gap-1.5" aria-label="Rarities that count">
                    {rarities.map((r) => (
                        <li key={r}>
                            <Badge size="sm" color="gray" type="pill-color">
                                {rarityLabel(r)}
                            </Badge>
                        </li>
                    ))}
                </ul>
                <Button color="secondary" size="sm" onClick={countAll} isLoading={clearing}>
                    Count every rarity
                </Button>
            </div>
        </div>
    );
}
