"use client";

import { type ReactNode, Suspense, useState } from "react";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { CardsList } from "@/components/app/cards-list";
import { CardsSkeleton } from "@/components/app/skeletons";
import { ViewMenu } from "@/components/app/view-menu";
import type { Card, CardFilter, CardList } from "@/lib/cards";
import type { CardsSize, CardsViewMode } from "@/lib/cards-view";

// Wraps the card list with the shared detail slideout and the View menu. The page reads the
// layout and size from cookies and hands them in, so the HTML already shows the chosen view.
// The menu sits at the right end of the page's filter row, which comes in as `toolbar`, so
// search, filters, sort and view share one line. The row is drawn at once; the list under it
// is a promise the page did not wait for, and shows its outline until the cards land.
export function CardsView({
    list,
    filter,
    narrowed,
    initialView,
    initialSize = "md",
    toolbar,
    noHits,
    empty,
}: {
    list: Promise<CardList>;
    filter: CardFilter;
    narrowed: boolean;
    initialView: CardsViewMode;
    initialSize?: CardsSize;
    toolbar?: ReactNode;
    /** Drawn in the list's place when the filters find nothing, so the row above keeps its place in the tree. */
    noHits: ReactNode;
    /** Drawn in the list's place when the folder holds nothing at all. */
    empty: ReactNode;
}) {
    const [view, setView] = useState(initialView);
    const [size, setSize] = useState(initialSize);
    const [selected, setSelected] = useState<Card | null>(null);

    return (
        // A column that grows: an empty state under the row takes the rest of the page and sits in the middle of it.
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                {/* In its own box: an element that crossed the server boundary, in a list with local ones, trips the key check. */}
                <div className="contents">{toolbar}</div>
                <ViewMenu view={view} size={size} onView={setView} onSize={setSize} />
            </div>

            <Suspense fallback={<CardsSkeleton />}>
                <CardsList list={list} filter={filter} narrowed={narrowed} view={view} size={size} onSelect={setSelected} noHits={noHits} empty={empty} />
            </Suspense>

            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
