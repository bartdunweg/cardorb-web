"use client";

import { type ReactNode, use, useEffect, useRef, useState, useTransition } from "react";
import { loadMoreCards } from "@/app/(app)/dashboard/list-actions";
import { CardsGrid } from "@/components/app/cards-grid";
import { CardsTable } from "@/components/app/cards-table";
import { CardsSkeleton } from "@/components/app/skeletons";
import { Button } from "@/components/base/buttons/button";
import type { Card, CardFilter, CardList } from "@/lib/cards";
import type { CardsSize, CardsViewMode } from "@/lib/cards-view";

/**
 * The cards of a folder, as many as the reader has scrolled to.
 *
 * The first batch arrives with the page, as a promise the server handed over without waiting
 * for it: the page's title and row are on screen while the API answers, and this suspends in
 * the list's place alone. Every batch after that is asked for when the sentinel under the list
 * comes within a screen of view, and appended. Nothing here pages by URL: the sort and the
 * filters stay in it, how far the reader scrolled does not.
 */
export function CardsList({
    list,
    filter,
    narrowed,
    view,
    size,
    onSelect,
    noHits,
    empty,
}: {
    list: Promise<CardList>;
    filter: CardFilter;
    narrowed: boolean;
    view: CardsViewMode;
    size: CardsSize;
    onSelect: (card: Card) => void;
    /** When a search or a filter finds nothing. */
    noHits: ReactNode;
    /** When the folder holds nothing at all. */
    empty: ReactNode;
}) {
    const first = use(list);
    const [cards, setCards] = useState(first.cards);
    const [failed, setFailed] = useState(false);
    const [pending, startTransition] = useTransition();
    const sentinel = useRef<HTMLDivElement>(null);
    const more = cards.length < first.total;

    const loadMore = () => {
        if (pending) return;
        setFailed(false);
        startTransition(async () => {
            try {
                const next = await loadMoreCards({ ...filter, offset: cards.length });
                // A card added while the reader scrolled shifts the batches by one; a card seen
                // twice would be one key twice, so a repeat is dropped rather than drawn again.
                setCards((have) => {
                    const seen = new Set(have.map((c) => c.id));
                    return [...have, ...next.filter((c) => !seen.has(c.id))];
                });
            } catch {
                setFailed(true);
            }
        });
    };

    // A screen ahead of the sentinel, so the next batch is drawn before the reader reaches the
    // end. One observer per batch: it disconnects on the first sight and the effect makes a new
    // one when the appended cards move the sentinel down.
    useEffect(() => {
        const el = sentinel.current;
        if (!el || !more || pending || failed || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                observer.disconnect();
                loadMore();
            },
            { rootMargin: "100% 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
        // loadMore closes over the current length; the effect reruns when it changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [more, pending, failed, cards.length]);

    if (first.total === 0) return <div className="flex flex-1 flex-col">{narrowed ? noHits : empty}</div>;

    return (
        <>
            {view === "grid" ? <CardsGrid cards={cards} onSelect={onSelect} size={size} /> : <CardsTable cards={cards} onSelect={onSelect} />}
            {pending ? <CardsSkeleton count={6} /> : null}
            {/* Where the next batch is asked for. Also the manual way in: a browser without the observer, or a
                reader who would rather press. One button through loading and failure alike, so a keyboard
                that pressed it keeps its place; it unmounts only when the last card is in. */}
            {more ? (
                <div ref={sentinel} className="flex flex-col items-center gap-3 py-2">
                    {failed ? <p className="text-sm text-tertiary">The next cards did not load.</p> : null}
                    <Button color={failed ? "secondary" : "tertiary"} size="sm" onClick={loadMore} aria-disabled={pending || undefined}>
                        {pending ? "Loading…" : failed ? "Try again" : "Show more"}
                    </Button>
                </div>
            ) : null}
            <p aria-live="polite" className="sr-only">
                {pending ? "Loading more cards…" : `Showing ${cards.length} of ${first.total} cards`}
            </p>
        </>
    );
}
