"use client";

import { CheckPicker } from "@/components/app/rarity-picker";
import { CARD_KINDS } from "@/lib/folder-rule";

// The kinds of card that fill a Pokédex: V, ex, GX and the rest, read off a card's name. Beside
// the rarities, since a rarity cannot tell a full-art V from a full-art ex.
export function KindPicker({ selected, onChange }: { selected: string[]; onChange: (kinds: string[]) => void }) {
    return (
        <CheckPicker
            label="Kinds of card"
            options={CARD_KINDS.map((k) => ({ value: k.id, label: k.label }))}
            selected={selected}
            onChange={onChange}
            none="Every kind: regular cards, V, ex, GX and the rest."
        />
    );
}
