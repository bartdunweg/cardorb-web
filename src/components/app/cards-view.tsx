"use client";

import { type ReactNode, useState } from "react";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { CardsGrid } from "@/components/app/cards-grid";
import { CardsTable } from "@/components/app/cards-table";
import { ViewMenu } from "@/components/app/view-menu";
import type { Card } from "@/lib/cards";
import type { CardsSize, CardsViewMode } from "@/lib/cards-view";

// Wraps the card list with the shared detail slideout and the View menu. The page reads the
// layout and size from cookies and hands them in, so the HTML already shows the chosen view.
// The menu sits at the right end of the page's filter row, which comes in as `toolbar`, so
// search, filters, sort and view share one line.
export function CardsView({
    cards,
    initialView,
    initialSize = "md",
    toolbar,
}: {
    cards: Card[];
    initialView: CardsViewMode;
    initialSize?: CardsSize;
    toolbar?: ReactNode;
}) {
    const [view, setView] = useState(initialView);
    const [size, setSize] = useState(initialSize);
    const [selected, setSelected] = useState<Card | null>(null);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                {/* In its own box: an element that crossed the server boundary, in a list with local ones, trips the key check. */}
                <div className="contents">{toolbar}</div>
                <ViewMenu view={view} size={size} onView={setView} onSize={setSize} />
            </div>

            {view === "grid" ? <CardsGrid cards={cards} onSelect={setSelected} size={size} /> : <CardsTable cards={cards} onSelect={setSelected} />}

            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
