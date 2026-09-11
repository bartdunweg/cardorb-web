"use client";

import { type ReactNode, useState } from "react";
import dynamic from "next/dynamic";
import { CardsGrid } from "@/components/app/cards-grid";
import { ViewMenu } from "@/components/app/view-menu";
import type { PublicCard } from "@/lib/cards";
import type { CardsSize } from "@/lib/cards-view";

// The card sheet, fetched on the tap that opens it: it is the app's largest client chunk and the
// grid is drawn long before anyone touches a tile. `ssr: false` — the sheet is nothing until then.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

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
            {empty ?? <CardsGrid cards={cards} onSelect={setSelected} size={size} holder="owner" />}
            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} readOnly />
        </div>
    );
}
