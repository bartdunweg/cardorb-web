"use client";

import { type ReactNode, useState } from "react";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { CardsGrid } from "@/components/app/cards-grid";
import { ViewMenu } from "@/components/app/view-menu";
import type { PublicCard } from "@/lib/cards";
import type { CardsSize } from "@/lib/cards-view";

// Public, read-only card grid: tap a card for a read-only detail (no editing, no personal fields).
// The View menu offers the size alone: a public card has no columns for a table.
export function PublicCardsView({
    cards,
    initialSize = "md",
    toolbar,
    empty,
}: {
    cards: PublicCard[];
    initialSize?: CardsSize;
    toolbar?: ReactNode;
    empty?: ReactNode;
}) {
    const [size, setSize] = useState(initialSize);
    const [selected, setSelected] = useState<PublicCard | null>(null);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="contents">{toolbar}</div>
                <ViewMenu view="grid" size={size} onView={() => {}} onSize={setSize} layouts={false} />
            </div>
            {empty ?? <CardsGrid cards={cards} onSelect={setSelected} size={size} />}
            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} readOnly />
        </div>
    );
}
