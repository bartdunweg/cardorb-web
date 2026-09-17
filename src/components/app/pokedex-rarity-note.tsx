"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCollection } from "@/app/(app)/dashboard/collections/actions";
import { notify } from "@/components/app/toast";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { type PokedexSetting, rarityLabel } from "@/lib/folder-rule";
import { forgetMineQuietly } from "@/lib/forget-mine";

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
    // Pressed, for the setting it was pressed on (by its contents, as a refresh hands in a new object):
    // the note goes at once, and comes back if the write fails.
    const [cleared, setCleared] = useState<string | null>(null);
    const rarities = setting.rarities ?? [];
    const on = JSON.stringify(setting);
    if (rarities.length === 0 || cleared === on) return null;

    /* The note goes on the press and the write follows. The button spun through the write and then
       through the whole Pokédex drawn twice, inside the action's answer and again by the refresh.
       The slots do need the server's new answer, so the page is refreshed once, after the cache is
       dropped quietly. A write that fails puts the note back and says so. */
    const countAll = () => {
        setCleared(on);
        // The button this was pressed on is gone at once, and with it the focus it held: without a
        // word, a keyboard starts over at the top and a screen reader hears nothing at all. The
        // toast is the live region that says what happened.
        notify.done("Every rarity counts now");
        void updateCollection(folderId, { pokedex: { missing: setting.missing, ...(setting.dex ? { dex: setting.dex } : {}) } }, { reread: false }).then(
            (res) => {
                if (!res.ok) {
                    setCleared(null);
                    notify.failed("Only these rarities still count", { description: res.error });
                    return;
                }
                void forgetMineQuietly("binders").then(() => router.refresh());
            },
            () => {
                setCleared(null);
                notify.failed("Only these rarities still count");
            },
        );
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
                <Button color="secondary" size="sm" onClick={countAll}>
                    Count every rarity
                </Button>
            </div>
        </div>
    );
}
