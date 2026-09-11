"use client";

import { type ReactNode, use, useEffect, useRef, useState, useTransition } from "react";
import { loadMoreCards } from "@/app/(app)/dashboard/list-actions";
import { CardsGrid } from "@/components/app/cards-grid";
import { CardsTable } from "@/components/app/cards-table";
import { GotItButton } from "@/components/app/got-it-button";
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
/**
 * The URL of the list the reader saw last, in this tab. A module variable, not state: the list is
 * keyed on its URL and remounts on every search, so nothing inside a mount remembers the one
 * before it. Read once at mount, written after; the same page's URL with a different query is a
 * list the reader changed, any other is one they arrived at.
 */
let lastListKey: string | null = null;
const pathOf = (key: string) => key.split("?")[0];

export function CardsList({
    list,
    listKey,
    filter,
    narrowed,
    view,
    size,
    onSelect,
    noHits,
    empty,
}: {
    list: Promise<CardList>;
    /** The list's own URL, what `cards-view` keys this on; for telling a change from an arrival. */
    listKey?: string;
    filter: CardFilter;
    narrowed: boolean;
    view: CardsViewMode;
    size: CardsSize;
    onSelect: (card: Card, siblings: Card[]) => void;
    /** When a search or a filter finds nothing. */
    noHits: ReactNode;
    /** When the folder holds nothing at all. */
    empty: ReactNode;
}) {
    const first = use(list);
    /* The server's first page, and whatever scrolling has appended to it — two things, not one
       array copied once. `useState(first.cards)` took that copy on the first render and kept it,
       so a card removed from the sheet was still on the list behind after the page re-read: the
       refresh handed down a new first page and nothing was listening.
       Reset during render rather than in an effect, which is the shape React asks for and the one
       this repo's lint allows. */
    const [appended, setAppended] = useState<Card[]>([]);
    const [seed, setSeed] = useState(first.cards);
    if (seed !== first.cards) {
        setSeed(first.cards);
        setAppended([]);
    }
    const cards = appended.length ? [...first.cards, ...appended] : first.cards;
    const setCards = (next: (have: Card[]) => Card[]) => setAppended((have) => next([...first.cards, ...have]).slice(first.cards.length));
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

    /* The count a screen reader hears. The zero case is in it, and the region is the first thing
       returned rather than the last: it used to sit after the list, behind the early return that a
       search to nothing takes, so the region that would have said "no cards" was the one thing the
       empty list unmounted. */
    const announcement = pending
        ? "Loading more cards…"
        : first.total === 0
          ? narrowed
              ? "No cards found."
              : ""
          : `Showing ${cards.length} of ${first.total} cards`;

    /* Moving it above the early return is not enough on its own. `folder-body.tsx` keys the whole
       view on the list's URL, so a search does not update this component, it replaces it — and a
       live region that arrives with its text already in it is never read out. Where the reader
       changed this list (`changed`), the region is therefore mounted empty and the sentence written a
       beat later, so what a screen reader sees is a region that was already standing and then
       changed. A plain effect is not enough either: React commits the insert and the text in one
       batch, which is one mutation record and one region-with-content again. Arriving at a list
       writes the count straight away instead, so landing somewhere is not narrated; the node then
       stays put, and Show more speaks by changing it.

       Changed, not narrowed: it used to ask "is this list filtered", which is the wrong question —
       clearing a search back to the whole list is as much a change as narrowing it, and was silent.
       The reader changed the list when the one they saw last, in this tab, was the same page with
       a different query. The comparison is made once, in the state's initialiser, because the
       variable it reads is written by the effect below and a render must not depend on that. */
    const [changed] = useState(
        () => narrowed || (lastListKey !== null && listKey !== undefined && lastListKey !== listKey && pathOf(lastListKey) === pathOf(listKey)),
    );
    useEffect(() => {
        if (listKey !== undefined) lastListKey = listKey;
    }, [listKey]);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setReady(true), 100);
        return () => clearTimeout(t);
    }, []);

    return (
        <>
            {/* sr-only is position: absolute, so it is not a flex item and adds neither height nor gap. */}
            <p aria-live="polite" className="sr-only">
                {changed && !ready ? "" : announcement}
            </p>
            {first.total === 0 ? (
                <div className="flex flex-1 flex-col">{narrowed ? noHits : empty}</div>
            ) : (
                <>
                    {view === "grid" ? (
                        <CardsGrid
                            cards={cards}
                            onSelect={onSelect}
                            size={size}
                            // The wishlist's tiles carry "Got it": the list says which list it is, rather than
                            // the grid reading it off a card's fields, so the collection never grows the button.
                            action={filter.wishlist ? (card, compact) => <GotItButton card={card} compact={compact} /> : undefined}
                        />
                    ) : (
                        <CardsTable cards={cards} onSelect={onSelect} />
                    )}
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
                </>
            )}
        </>
    );
}
