"use client";

import { type ReactNode, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CardsList } from "@/components/app/cards-list";
import type { PeriodKey } from "@/components/app/chart-periods";
import { useListTotals } from "@/components/app/list-totals";
import { LIST_ROW } from "@/components/app/row-search";
import { CardsSkeleton } from "@/components/app/skeletons";
import { ViewMenu } from "@/components/app/view-menu";
import { useCardsView } from "@/hooks/use-cards-view";
import type { Card, CardFilter, CardList } from "@/lib/cards";
import type { CardsGroup, CardsSize, CardsViewMode } from "@/lib/cards-view";

// The card sheet, fetched on the tap that opens it: it is the app's largest client chunk and the
// grid is drawn long before anyone touches a tile. `ssr: false`: the sheet is nothing until then.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

// Wraps the card list with the shared detail slideout and the View menu. The page reads the
// layout and size from cookies and hands them in, so the HTML already shows the chosen view;
// once chosen in this tab, `use-cards-view` wins over a page the router kept from before.
// The menu sits at the right end of the page's filter row, which comes in as `toolbar`, so
// search, filters, sort and view share one line. The row is drawn at once; the list under it
// is a promise the page did not wait for, and shows its outline until the cards land.
export function CardsView({
    list,
    filter,
    narrowed,
    initialView,
    initialSize = "md",
    sortedBySet = false,
    initialGroup = "sets",
    listKey,
    toolbar,
    noHits,
    empty,
    period,
    viewInBar = false,
    views,
}: {
    list: Promise<CardList>;
    filter: CardFilter;
    narrowed: boolean;
    initialView: CardsViewMode;
    initialSize?: CardsSize;
    /** The list arrives set by set: the grid says so with a heading over each one, unless the View menu chose one list. */
    sortedBySet?: boolean;
    /** Headings or one list, as the cookie holds it, for the first paint. */
    initialGroup?: CardsGroup;
    /**
     * The list's URL. It keys the list and nothing above it: a new search is a new list, with its
     * own first batch and nothing scrolled-to from the last one, but the row over it, the search
     * field included, must not be rebuilt, or the caret leaves the box on every keystroke that
     * lands. It used to key this whole component, which is exactly what happened.
     */
    listKey?: string;
    toolbar?: ReactNode;
    /** Drawn in the list's place when the filters find nothing, so the row above keeps its place in the tree. */
    noHits: ReactNode;
    /** Drawn in the list's place when the binder holds nothing at all. */
    empty: ReactNode;
    /** The page puts View in its bar on a phone (`BarViewMenu`), so the row does not. */
    viewInBar?: boolean;
    /** Collection | Wishlist, under the row with the filters and over the list, below lg (Bart's call, 2026-09-19). */
    views?: ReactNode;
    /**
     * The period a list sorted by price change is read over, where it is one of the chart's: a card
     * opened from it shows its price line and its figure over those same days. Left out for every
     * other sort, and for two dates of your own, which the chart has no button for.
     */
    period?: PeriodKey;
}) {
    const { view, size, group } = useCardsView(initialView, initialSize, initialGroup);
    /*
     * The card the sheet is on, and the list it came from, so it can step to the next one without
     * going back to the grid. Kept together: the list is what was on screen when the card was
     * picked, and a later page of results should not move somebody's Next somewhere else.
     */
    const [selected, setSelected] = useState<{ card: Card; siblings: Card[] } | null>(null);
    // One identity for the life of the view, so the list's memoised tiles are not drawn again when the sheet opens.
    // The focus a close puts back, after the sheet has gone: cleared by the next open, the next close, and leaving.
    const refocus = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(refocus.current), []);
    const select = useCallback((card: Card, siblings: Card[]) => {
        // A card opened before the last close's focus landed: that focus is no longer wanted.
        window.clearTimeout(refocus.current);
        setSelected({ card, siblings });
    }, []);
    /*
     * The cards the sheet has written off this list, gone from it at once.
     *
     * The list is read again after a write (the sheet's refresh), and until that read lands, or where
     * it never lands, an unstarred card sat on Favorites as if it were still starred: the chain is
     * the write, then the cache forgotten, then the refresh, and a page read from a cache that had
     * not caught up is the page from before the write. A card the reader has just taken off this very
     * list does not wait for any of that.
     *
     * Kept for the life of this list, which is keyed on its URL and so is mounted afresh for another
     * search or another binder: a read from before the write cannot bring the row back. Starred again
     * (the save failed and the star went back) takes it out of here, so the card returns.
     */
    const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set());
    /* The line under the title moves with it, as a tile's own buttons move it: the row left, and its
       copies and their worth with it (bug hunt 2026-09-19: Favorites said the old count until the page
       was read again). The card is the sheet's, the one whose star was turned. */
    const totals = useListTotals();
    const goneNow = useRef(gone);
    const sheetCard = useRef<Card | null>(null);
    useLayoutEffect(() => {
        sheetCard.current = selected?.card ?? null;
    });
    // What each unstar took off the line, so a star put back (a save that failed, after the arrows or a
    // close moved the sheet on) returns exactly that, whichever card the sheet is on by then.
    const taken = useRef(new Map<string, { rows: number; copies: number; value: number }>());
    const starChanged = useCallback(
        (cardId: string, starred: boolean) => {
            if (starred === !goneNow.current.has(cardId)) return;
            const next = new Set(goneNow.current);
            if (starred) next.delete(cardId);
            else next.add(cardId);
            goneNow.current = next;
            setGone(next);
            if (starred) {
                const back = taken.current.get(cardId);
                taken.current.delete(cardId);
                if (back) totals?.(back);
                return;
            }
            const card = sheetCard.current;
            if (card?.id !== cardId) return;
            const copies = card.quantity ?? 1;
            const change = { rows: 1, copies, value: copies * (card.price ?? 0) };
            taken.current.set(cardId, change);
            totals?.({ rows: -change.rows, copies: -change.copies, value: -change.value });
        },
        [totals],
    );

    /* Focus back on the card the sheet was last on once it has closed, where the dialog's own return
       went to the tile it was opened from (another card, after Next) or to the page (a card that left
       the list meanwhile); a card no longer on the list gives its place to the nearest one still there.
       After the sheet's exit, so the dialog's own restore does not move it again (bug hunt 2026-09-19). */
    const close = () => {
        const last = selected;
        setSelected(null);
        window.clearTimeout(refocus.current);
        if (!last) return;
        const from = last.siblings.findIndex((c) => c.id === last.card.id);
        const order = [last.card, ...last.siblings.slice(from + 1), ...last.siblings.slice(0, Math.max(0, from)).reverse()];
        // After the sheet's own exit (--duration-base, and a frame to spare).
        const wait = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--duration-base")) || 200) + 120;
        refocus.current = window.setTimeout(() => {
            // Only where the dialog's return left it (the page, another tile) or still in the closing sheet. Focus the reader has
            // moved since (the toast's Put back, the search field) stays where it is.
            const now = document.activeElement;
            if (now && now !== document.body && !now.closest("[data-card-id]") && !now.closest("[role=dialog]")) return;
            for (const c of order) {
                const tile = document.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(c.id)}"] button`);
                if (!tile) continue;
                const box = tile.getBoundingClientRect();
                tile.focus({ preventScroll: box.bottom > 0 && box.top < window.innerHeight });
                return;
            }
        }, wait);
    };

    const at = selected ? selected.siblings.findIndex((c) => c.id === selected.card.id) : -1;
    const step = (by: number) => {
        const next = at >= 0 ? selected?.siblings[at + by] : undefined;
        return next ? () => setSelected({ card: next, siblings: selected!.siblings }) : null;
    };

    return (
        // A column that grows: an empty state under the row takes the rest of the page and sits in the middle of it.
        <div className="flex flex-1 flex-col gap-4">
            <div className={LIST_ROW}>
                {/* In its own box: an element that crossed the server boundary, in a list with local ones, trips the key check. */}
                <div className="contents">{toolbar}</div>
                <ViewMenu
                    view={view}
                    size={size}
                    group={sortedBySet && view === "grid" ? group : undefined}
                    className={viewInBar ? "max-sm:hidden" : undefined}
                />
            </div>
            {views ? <div className="lg:hidden">{views}</div> : null}

            <Suspense fallback={<CardsSkeleton />}>
                <CardsList
                    key={listKey}
                    listKey={listKey}
                    list={list}
                    filter={filter}
                    narrowed={narrowed}
                    view={view}
                    size={size}
                    groupedBySet={sortedBySet && group === "sets"}
                    onSelect={select}
                    noHits={noHits}
                    empty={empty}
                    gone={gone}
                />
            </Suspense>

            {/* Only where the star is what puts a card on this list: elsewhere a star is a mark on a row
                that belongs here whichever way it is set. */}
            <CardDetailSlideout
                card={selected?.card ?? null}
                onClose={close}
                onPrev={step(-1)}
                onNext={step(1)}
                period={period}
                onStarChanged={filter.favoritesOnly ? starChanged : undefined}
            />
        </div>
    );
}
