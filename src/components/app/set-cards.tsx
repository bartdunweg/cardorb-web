"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { listCopies } from "@/app/(app)/dashboard/cards/actions";
import { SetCardTile } from "@/components/app/set-card-tile";
import { type SetCard, pokemonCardFromSetCard } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import { GRID_COLUMNS } from "@/lib/cards-view";

// The card sheet, fetched on the tap that opens it: it is the app's largest client chunk and the
// grid is drawn long before anyone touches a tile. `ssr: false` — the sheet is nothing until then.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

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
export function SetCards({ cards, language = "en", firstRow = 6 }: { cards: SetCard[]; language?: string; firstRow?: number }) {
    const [selected, setSelected] = useState<Card | null>(null);
    // The catalogue card behind an open sheet, so a card nobody holds can still be taken from it.
    const [addable, setAddable] = useState<SetCard | null>(null);
    /* Where in the set the open card is, so the sheet can offer the one either side. The set page
       had no arrows at all: you left the sheet, found the next card and opened it again, on a page
       whose whole point is going through a set in order. */
    const [at, setAt] = useState(-1);
    const open = async (card: SetCard) => {
        setAt(cards.findIndex((c) => c.id === card.id));
        /* The card you hold opens on its row; the catalogue's own is shown while that is read, so
           the sheet is never blank waiting for it. No guard against a second tap: opening the same
           card twice costs one read and lands on the same card, and the ref that used to prevent
           it could not be reached from an arrow without being touched during render. */
        setAddable(card.owned || card.wishlist ? null : card);
        setSelected(fromCatalogue(card));
        if (!card.owned && !card.wishlist) return;
        const rows = await listCopies({ set: card.setName, number: card.number, name: card.name });
        const row = rows[0];
        if (row) {
            setAddable(null);
            // The row stores one name, the English one; the printed name is the shelf's to tell.
            setSelected({ ...row, local_name: card.localName });
        }
    };

    /* Null rather than a dead button at either end: the sheet draws no arrow where there is
       nothing to go to, the same rule the card lists follow. */
    const step = (by: number) => {
        const next = at >= 0 ? cards[at + by] : undefined;
        return next ? () => void open(next) : null;
    };

    return (
        <>
            {/* The same grid as every other overview, at the same size: a set was denser than any
                list in the app, which is what made it read as a checklist rather than a shelf. */}
            <ul className={`grid gap-4 ${GRID_COLUMNS.md}`}>
                {cards.map((card, i) => (
                    <li key={card.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i, 16) * 20}ms` } as React.CSSProperties}>
                        <SetCardTile card={card} language={language} priority={i < firstRow} onOpen={open} />
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
                    setAt(-1);
                }}
                addable={addable ? pokemonCardFromSetCard(addable, language) : null}
                onPrev={step(-1)}
                onNext={step(1)}
            />
        </>
    );
}

/** A catalogue card as the sheet reads one: every field about a copy is empty, because there is none. */
const fromCatalogue = (c: SetCard): Card => ({
    id: c.id,
    name: c.name,
    local_name: c.localName,
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
