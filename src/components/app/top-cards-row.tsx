"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CardImage } from "@/components/app/card-image";
import type { Card } from "@/lib/api-shapes";
import { formatPrice } from "@/lib/format";

// The card sheet, fetched on the tap that opens it: it is the app's largest client chunk and the
// row is drawn long before anyone touches a tile. `ssr: false` — the sheet is nothing until then.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

// The dearest cards as a row that scrolls sideways, each a tile that opens the card's sheet.
// Scroll-snap per tile, the page's side padding bled through so the row runs edge to edge on
// a phone; the scrollbar stays hidden (the row's end is plain to see).
export function TopCardsRow({ cards }: { cards: Card[] }) {
    const [selected, setSelected] = useState<Card | null>(null);
    return (
        <>
            <ol className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
                {cards.map((card) => (
                    <li key={card.id} className="w-28 shrink-0 snap-start sm:w-32">
                        <button
                            type="button"
                            onClick={() => setSelected(card)}
                            className="flex w-full pressable cursor-pointer flex-col gap-1.5 rounded-card text-left outline-offset-2 outline-focus-ring focus-visible:outline-2"
                        >
                            <div className="relative aspect-card w-full overflow-hidden rounded-card bg-quaternary">
                                {card.image_url ? <CardImage src={card.image_high_url ?? card.image_url} alt="" width={160} className="object-cover" /> : null}
                            </div>
                            <span className="w-full truncate text-xs font-medium text-primary">{card.name}</span>
                            <span className="text-xs text-tertiary tabular-nums">{formatPrice(card.price)}</span>
                        </button>
                    </li>
                ))}
            </ol>
            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} />
        </>
    );
}
