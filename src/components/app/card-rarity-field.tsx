"use client";

import { useState } from "react";
import { setCardRarity } from "@/app/(app)/dashboard/cards/actions";
import { notify } from "@/components/app/toast";
import { Select } from "@/components/base/select/select";
import { NOT_KNOWN, raritiesFor } from "@/lib/rarities";

/**
 * What kind of printing this card is, where the catalogue could not say.
 *
 * A promo carries no rarity symbol: the black star is the set's mark, and every catalogue answers
 * "Promo" for the whole set. Nothing published tells a full art promo from a plain one, so the
 * person holding the card is the only one who can. What is chosen here is the catalogue's own
 * spelling, so the card lands in the same filters, binder rules and Pokédex slots as any other.
 *
 * The rarity belongs to the printing, not to one copy, so it is written to every row of it at once.
 *
 * `era` is what the card's own era printed, as the catalogue says (see raritiesFor). Without it
 * every kind is offered, which is what this control did on every card: a black star promo from
 * 1999 could be named "Special illustration rare", a word the game did not have until 2023.
 */
export function CardRarityField({
    cardIds,
    value,
    era,
    onSaved,
}: {
    cardIds: string[];
    value: string | null;
    /** The rarities the card's era printed, when the API has said. */
    era?: readonly string[] | null;
    onSaved: (rarity: string) => void;
}) {
    const [saving, setSaving] = useState<string | null>(null);
    const options = raritiesFor(era, value);

    const choose = async (value: string) => {
        if (!cardIds.length || saving) return;
        setSaving(value);
        const res = await setCardRarity(cardIds, value === NOT_KNOWN ? null : value);
        setSaving(null);
        if (!res.ok) {
            notify.failed(res.error);
            return;
        }
        // The row on screen answers at once; the toast says it landed, because the sheet stays open
        // and nothing else on it moves.
        onSaved(value === NOT_KNOWN ? "" : value);
        notify.done(value === NOT_KNOWN ? "Cleared" : `Saved as ${value}`);
    };

    return (
        <Select
            /* Named for the row it sits in, word for word: the visible label is "Rarity", and a
               spoken name that says something else leaves a voice user asking for a control nobody
               can hear (WCAG 2.5.3). What it is for is in the placeholder. */
            aria-label="Rarity"
            size="sm"
            className="w-56"
            placeholder="Say what it is"
            selectedKey={saving ?? (options.some((r) => r.value === value) ? value : null)}
            isDisabled={saving !== null}
            onSelectionChange={(key) => choose(String(key))}
            items={options.map((r) => ({ id: r.value, label: r.label }))}
        >
            {(item) => (
                <Select.Item key={item.id} id={item.id} label={item.label}>
                    {item.label}
                </Select.Item>
            )}
        </Select>
    );
}
