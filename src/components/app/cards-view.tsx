"use client";

import { type ReactNode, useState } from "react";
import { Grid01, Rows01 } from "@untitledui/icons";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { CardsGrid } from "@/components/app/cards-grid";
import { CardsTable } from "@/components/app/cards-table";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import type { Card } from "@/lib/cards";
import { CARDS_VIEW_COOKIE, type CardsViewMode } from "@/lib/cards-view";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Wraps the card list with a table/grid view toggle and the shared detail slideout. The page reads
// the choice from the cookie and hands it in, so the HTML already shows the chosen view. The
// toggle sits at the right end of the page's filter row, which comes in as `toolbar`, so search,
// filters and view share one line.
export function CardsView({ cards, initialView, toolbar }: { cards: Card[]; initialView: CardsViewMode; toolbar?: ReactNode }) {
    const [view, setView] = useState(initialView);
    const [selected, setSelected] = useState<Card | null>(null);

    const changeView = (next: CardsViewMode) => {
        setView(next);
        document.cookie = `${CARDS_VIEW_COOKIE}=${next}; path=/dashboard; max-age=${ONE_YEAR}; samesite=lax`;
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                {toolbar}
                <ButtonGroup
                    className="ml-auto"
                    size="sm"
                    selectionMode="single"
                    disallowEmptySelection
                    selectedKeys={new Set([view])}
                    onSelectionChange={(keys) => {
                        const key = [...keys][0];
                        if (key === "table" || key === "grid") changeView(key);
                    }}
                >
                    <ButtonGroupItem id="table" iconLeading={Rows01} aria-label="Table view" />
                    <ButtonGroupItem id="grid" iconLeading={Grid01} aria-label="Grid view" />
                </ButtonGroup>
            </div>

            {view === "grid" ? <CardsGrid cards={cards} onSelect={setSelected} /> : <CardsTable cards={cards} onSelect={setSelected} />}

            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
