"use client";

import { useState } from "react";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { CardsGrid } from "@/components/app/cards-grid";
import type { PublicCard } from "@/lib/cards";

// Public, read-only card grid: tap a card for a read-only detail (no editing, no personal fields).
export function PublicCardsView({ cards }: { cards: PublicCard[] }) {
    const [selected, setSelected] = useState<PublicCard | null>(null);

    return (
        <div className="flex flex-col gap-4">
            <CardsGrid cards={cards} onSelect={setSelected} />
            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} readOnly />
        </div>
    );
}
