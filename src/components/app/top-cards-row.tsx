"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button as AriaButton } from "react-aria-components";
import { CardImage } from "@/components/app/card-image";
import type { Card } from "@/lib/api-shapes";
import { cardLabel, cardLine, printingLine } from "@/lib/card-label";
import { formatPrice } from "@/lib/format";

// The card sheet, fetched on the tap that opens it: it is the app's largest client chunk and the
// row is drawn long before anyone touches a card. `ssr: false`: the sheet is nothing until then.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

/**
 * The dearest cards as a row that scrolls sideways inside its tile, each with its rank (1, 2, 3). Each is the picture small at the
 * left with its name, set code and price beside it, and a hairline between one and the next (Bart,
 * 2026-09-15): the price is the point of the row, so it reads beside the card rather than under a
 * picture it had to share a narrow column with. The whole item opens the card's sheet, and the
 * arrows in the sheet step along the row.
 */
export function TopCardsRow({ cards }: { cards: Card[] }) {
    const [at, setAt] = useState<number | null>(null);
    const selected = at === null ? null : (cards[at] ?? null);
    const step = (by: number) => (at !== null && cards[at + by] ? () => setAt(at + by) : null);
    return (
        <>
            <ol className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto">
                {cards.map((card, i) => (
                    <li key={card.id} className="flex shrink-0 snap-start not-first:border-l not-first:border-secondary not-first:pl-3 not-last:pr-3">
                        <AriaButton
                            onPress={() => setAt(i)}
                            aria-label={`${card.name}, ${cardLabel(card)}, ${formatPrice(card.price)}`}
                            className="flex w-60 pressable cursor-pointer items-center gap-3 rounded-lg p-1.5 text-left outline-focus-ring transition-colors hover:bg-alpha-black/4 data-focus-visible:outline-2"
                        >
                            {/* The rank, for the eye: the list is an ordered one, so a screen reader already says which place. */}
                            <span aria-hidden="true" className="w-5 shrink-0 text-center text-sm font-semibold text-tertiary tabular-nums">
                                {i + 1}
                            </span>
                            <div className="relative aspect-card w-12 shrink-0 overflow-hidden rounded-sm bg-quaternary">
                                {card.image_url ? <CardImage src={card.image_url} alt="" width={96} className="object-cover" /> : null}
                            </div>
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm font-medium text-primary">{card.name}</span>
                                <span className="truncate text-xs text-tertiary">{cardLine(card)}</span>
                                {printingLine(card) ? <span className="truncate text-xs text-tertiary">{printingLine(card)}</span> : null}
                                <span className="mt-0.5 text-sm font-semibold text-primary tabular-nums">{formatPrice(card.price)}</span>
                            </span>
                        </AriaButton>
                    </li>
                ))}
            </ol>
            <CardDetailSlideout card={selected} onClose={() => setAt(null)} onPrev={step(-1)} onNext={step(1)} />
        </>
    );
}
