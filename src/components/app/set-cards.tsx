"use client";

import { useRef, useState } from "react";
import { listCopies } from "@/app/(app)/dashboard/cards/actions";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { SetCardTile } from "@/components/app/set-card-tile";
import { type SetCard, pokemonCardFromSetCard } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import { GRID_COLUMNS } from "@/lib/cards-view";

/**
 * A set's cards, and the sheet a tap opens.
 *
 * The tiles were menu buttons: tapping a card answered with a list of things to do to it and
 * never with the card. Every other list in this app opens the sheet, so this one does too.
 *
 * A card you hold opens on its own row, the same way the Pokédex does it — the row carries the
 * copies, the price you paid and the folder, none of which the catalogue knows. A card you do
 * not hold has no row, so it opens on what the set page already has: the printing, read-only,
 * with its price line. Adding it is the plus and the menu beside it, which is where it was.
 */
export function SetCards({ cards, readOnly, firstRow = 6 }: { cards: SetCard[]; readOnly: boolean; firstRow?: number }) {
    const [selected, setSelected] = useState<Card | null>(null);
    // The catalogue card behind an open sheet, so a card nobody holds can still be taken from it.
    const [addable, setAddable] = useState<SetCard | null>(null);
    // One at a time: a second tap while the first is still reading the copies would open the wrong card.
    const opening = useRef<string | null>(null);

    const open = async (card: SetCard) => {
        if (opening.current === card.id) return;
        opening.current = card.id;
        try {
            if (card.owned || card.wishlist) {
                const rows = await listCopies({ set: card.setName, number: card.number, name: card.name });
                const row = rows[0];
                if (row) {
                    setAddable(null);
                    setSelected(row);
                    return;
                }
            }
            setAddable(card);
            setSelected(fromCatalogue(card));
        } finally {
            opening.current = null;
        }
    };

    return (
        <>
            {/* The same grid as every other overview, at the same size: a set was denser than any
                list in the app, which is what made it read as a checklist rather than a shelf. */}
            <ul className={`grid gap-4 ${GRID_COLUMNS.md}`}>
                {cards.map((card, i) => (
                    <li key={card.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i, 16) * 20}ms` } as React.CSSProperties}>
                        <SetCardTile card={card} readOnly={readOnly} priority={i < firstRow} onOpen={open} />
                    </li>
                ))}
            </ul>
            {/* A card you hold opens on its row and can be changed. One you do not opens on the
                printing, with the two ways to take it — the sheet is where you looked for them. */}
            <CardDetailSlideout
                card={selected}
                onClose={() => {
                    setSelected(null);
                    setAddable(null);
                }}
                addable={addable ? pokemonCardFromSetCard(addable) : null}
            />
        </>
    );
}

/** A catalogue card as the sheet reads one: every field about a copy is empty, because there is none. */
const fromCatalogue = (c: SetCard): Card => ({
    id: c.id,
    name: c.name,
    set_name: c.setName,
    set_abbr: null,
    set: c.setName,
    number: c.number,
    rarity: c.rarity,
    gen: null,
    types: c.types,
    quantity: 0,
    owned: false,
    is_favorite: false,
    excluded: false,
    condition: null,
    grade: null,
    language: null,
    finish: null,
    foil_pattern: null,
    purchase_price: null,
    purchase_date: null,
    acquired_at: null,
    notes: null,
    price: c.price,
    image_url: c.imageUrl,
    image_high_url: c.imageHighUrl,
    tcg_id: c.tcgId ?? null,
    collection_id: null,
    wishlist: false,
    species_id: null,
});
