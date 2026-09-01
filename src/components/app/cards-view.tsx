"use client";

import { useState, useSyncExternalStore } from "react";
import { Grid01, Rows01 } from "@untitledui/icons";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { CardsGrid } from "@/components/app/cards-grid";
import { CardsTable } from "@/components/app/cards-table";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import type { Card } from "@/lib/cards";

type View = "table" | "grid";

const VIEW_EVENT = "cards-view-change";

// Persisted view preference read through useSyncExternalStore: the server snapshot is "table", so
// hydration matches, then it resolves to the stored value — no setState-in-effect, no mismatch.
function useStoredView(): [View, (next: View) => void] {
    const view = useSyncExternalStore(
        (onChange) => {
            window.addEventListener(VIEW_EVENT, onChange);
            return () => window.removeEventListener(VIEW_EVENT, onChange);
        },
        () => (localStorage.getItem("cards-view") === "grid" ? "grid" : "table"),
        () => "table" as View,
    );

    const setView = (next: View) => {
        localStorage.setItem("cards-view", next);
        window.dispatchEvent(new Event(VIEW_EVENT));
    };

    return [view, setView];
}

// Wraps the card list with a table/grid view toggle and the shared detail slideout.
export function CardsView({ cards }: { cards: Card[] }) {
    const [view, changeView] = useStoredView();
    const [selected, setSelected] = useState<Card | null>(null);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-end">
                <ButtonGroup
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
