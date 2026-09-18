"use client";

import { type ReactNode, use, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { warmCardFacts } from "@/components/app/card-memo";
import { CardsGrid, FIRST_ROW } from "@/components/app/cards-grid";
import { GotItButton } from "@/components/app/got-it-button";
import { TableSkeleton } from "@/components/app/skeletons";
import { Button } from "@/components/base/buttons/button";
import type { Card, CardFilter, CardList } from "@/lib/cards";
import type { CardsSize, CardsViewMode } from "@/lib/cards-view";
import { formatCount } from "@/lib/format";
import { MORE_CEILING } from "@/lib/list-filter";
import { loadMoreCards } from "@/lib/reads";

// Drawn only in the table view, so its code (the kit table) loads when that view is chosen; still drawn on the server.
const CardsTable = dynamic(() => import("@/components/app/cards-table").then((m) => m.CardsTable), { loading: () => <TableSkeleton /> });

/**
 * The cards of a binder, as many as the reader has scrolled to.
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
    groupedBySet = false,
    onSelect,
    noHits,
    empty,
    gone,
}: {
    list: Promise<CardList>;
    /** The list's own URL, what `cards-view` keys this on; for telling a change from an arrival. */
    listKey?: string;
    filter: CardFilter;
    narrowed: boolean;
    view: CardsViewMode;
    size: CardsSize;
    /** The list arrives set by set; the grid draws a heading over each one. */
    groupedBySet?: boolean;
    onSelect: (card: Card, siblings: Card[]) => void;
    /** When a search or a filter finds nothing. */
    noHits: ReactNode;
    /** When the binder holds nothing at all. */
    empty: ReactNode;
    /**
     * Cards the reader has just written off this very list (a star turned off on Favorites), gone
     * from it at once rather than when the page has been read again. Held by the view above, which
     * is where the sheet's writes land; the list only leaves them out, of what it draws and of what
     * it says it is showing.
     */
    gone?: ReadonlySet<string>;
}) {
    const first = use(list);
    /* The server's first page, and whatever scrolling has appended to it: two things, not one
       array copied once. `useState(first.cards)` took that copy on the first render and kept it,
       so a card removed from the sheet was still on the list behind after the page re-read: the
       refresh handed down a new first page and nothing was listening.
       Reset during render rather than in an effect, which is the shape React asks for and the one
       this repo's lint allows. */
    const [appended, setAppended] = useState<Card[]>([]);
    /* How far into the list the API has answered, repeats included: where the next batch starts.
       Not `cards.length`, which a dropped repeat holds back, so the same rows were asked for again.
       And `end`, once a batch says there is nothing after it: the first page's count can be stale
       (it is cached, and the API folds rows on its own), and going by it alone, a list short of that
       count asked for an empty batch, drew the skeleton, and asked again, for as long as you looked. */
    const [read, setRead] = useState(first.cards.length);
    const [end, setEnd] = useState(false);
    /* A new first page for this same list (the list is keyed on its URL, so another search is another
       mount) is the page read again after a write: the sheet's refresh, a copy saved, a wish put back.
       It used to throw away every batch scrolling had appended, so a reader two hundred tiles down
       was dropped back to the first 48, the page shrank under them and the list read itself back in:
       the grid "refreshed". What was appended stays on screen now, less anything the new first page
       already holds, and the span is read again behind it (`recheck`) so a card removed or changed
       down there follows too. */
    const [pending, startTransition] = useTransition();
    const [rechecking, startRecheck] = useTransition();
    const [seed, setSeed] = useState(first.cards);
    const [recheck, setRecheck] = useState<Card[] | null>(null);
    if (seed !== first.cards) {
        setSeed(first.cards);
        const onFirst = new Set(first.cards.map((c) => c.id));
        setAppended((have) => have.filter((c) => !onFirst.has(c.id)));
        /* A batch still on its way counts as appended: it was asked for at an offset into the old
           page, so the span is read again once it lands rather than trusted as it comes. */
        if (appended.length || pending) setRecheck(first.cards);
        else {
            setRead(first.cards.length);
            setEnd(false);
        }
    }
    /* Kept by identity while neither part changes, so the grid's memoised tiles are left alone. A card
       the first page holds is not drawn again from the appended span: a batch that lands between a new
       first page and its re-read was cut against the old one, and one card twice is one key twice. */
    const cards = useMemo(() => {
        let whole = first.cards;
        if (appended.length) {
            const onFirst = new Set(first.cards.map((c) => c.id));
            whole = [...first.cards, ...appended.filter((c) => !onFirst.has(c.id))];
        }
        return gone?.size ? whole.filter((c) => !gone.has(c.id)) : whole;
    }, [first.cards, appended, gone]);
    /* How many of the cards read are ones the reader took off this list, so the count says what is on
       screen: the first page's own total still counts them, and it is read from the store, which the
       write may not have reached yet. */
    const dropped = useMemo(
        () => (gone?.size ? first.cards.filter((c) => gone.has(c.id)).length + appended.filter((c) => gone.has(c.id)).length : 0),
        [first.cards, appended, gone],
    );
    const groups = useMemo(() => setGroups(cards, groupedBySet), [cards, groupedBySet]);
    /* The ids of the first page, for the arrival wave: a set's grid that a scroll batch starts is new,
       and its own first draw is not the page's. One reference per first page, so no tile redraws. */
    const firstPageIds = useMemo(() => new Set(first.cards.map((c) => c.id)), [first.cards]);
    const selectFromList = useCallback((card: Card) => onSelect(card, cards), [onSelect, cards]);
    /* The facts of every card on the list, a page per request as the pages arrive, so a sheet opened
       on any of them draws its choices on its first paint (card-memo.ts). */
    useEffect(() => {
        const all = [...first.cards, ...appended];
        // Each catalogue asked apart: a Japanese card's id is only in the Japanese one.
        warmCardFacts(all.filter((c) => c.language !== "ja").map((c) => c.tcg_id));
        warmCardFacts(
            all.filter((c) => c.language === "ja").map((c) => c.tcg_id),
            "ja",
        );
    }, [first.cards, appended]);
    const [failed, setFailed] = useState(false);
    const sentinel = useRef<HTMLDivElement>(null);
    const more = !end && read < first.total;
    /* The button spins while the span is read again too, where a press would otherwise do nothing
       without a word. Only its spinner: the region below still says the count, since no card is being
       added to the list while it is read again. */
    const busy = pending || rechecking || recheck !== null;
    // Once the list has run out, what it holds is the count, whatever the first page said.
    const total = end ? cards.length : Math.max(0, first.total - dropped);

    /* The appended span read again after the first page was, as far as the reader had scrolled. Its
       own transition, so the button at the end does not spin and a screen reader is not told more
       cards are loading; a batch on scroll waits for it, since both write the same offsets. A read
       that fails keeps what is on screen.
       And it waits for a batch already on its way: `upTo` is taken once that batch has counted, so the
       span read again covers it. Taken before, the batch landed first and the re-read, answering
       for the shorter span, threw away the cards it had just appended. */
    useEffect(() => {
        if (!recheck || pending) return;
        let live = true;
        const upTo = read;
        startRecheck(async () => {
            /* One read for the whole span, not a batch of 48 after another: two thousand cards down that
               was forty requests in a row, with scrolling and Show more waiting on all of them. Past the
               API's ceiling the span goes in reads of that size, side by side. */
            const got: Card[] = [];
            let offset = recheck.length;
            let done = false;
            try {
                const starts: number[] = [];
                for (let at = recheck.length; at < upTo; at += MORE_CEILING) starts.push(at);
                const answers = await Promise.all(starts.map((at) => loadMoreCards({ ...filter, offset: at, limit: Math.min(MORE_CEILING, upTo - at) })));
                for (const [i, batch] of answers.entries()) {
                    got.push(...batch.cards);
                    offset += batch.cards.length;
                    if (batch.cards.length === 0 || offset >= batch.total) {
                        done = true;
                        break;
                    }
                    // A read short of what it asked for leaves the reads after it at the wrong offsets; scrolling goes on from here.
                    if (batch.cards.length < Math.min(MORE_CEILING, upTo - starts[i]!)) break;
                }
            } catch {
                if (live) setRecheck(null);
                return;
            }
            if (!live) return;
            const onFirst = new Set(recheck.map((c) => c.id));
            const seen = new Set<string>();
            setAppended(got.filter((c) => !onFirst.has(c.id) && !seen.has(c.id) && seen.add(c.id)));
            setRead(offset);
            setEnd(done);
            setRecheck(null);
        });
        return () => {
            live = false;
        };
        // Once per first page, after any batch in flight: `read` and `filter` as they are then.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recheck, pending]);

    const loadMore = () => {
        if (busy) return;
        setFailed(false);
        startTransition(async () => {
            try {
                const batch = await loadMoreCards({ ...filter, offset: read });
                // A card added while the reader scrolled shifts the batches by one; a card seen
                // twice would be one key twice, so a repeat is dropped rather than drawn again.
                // Against the appended span as it is when the batch lands; a card on the first page is left
                // out where the list is drawn, so a first page that changed meanwhile is not closed over here.
                setAppended((have) => {
                    const seen = new Set(have.map((c) => c.id));
                    return [...have, ...batch.cards.filter((c) => !seen.has(c.id))];
                });
                setRead(read + batch.cards.length);
                if (batch.cards.length === 0 || read + batch.cards.length >= batch.total) setEnd(true);
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
        if (!el || !more || pending || rechecking || recheck || failed || typeof IntersectionObserver === "undefined") return;
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
        // loadMore closes over how far the list has read; the effect reruns when it changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [more, pending, rechecking, recheck, failed, read]);

    /* The count a screen reader hears. The zero case is in it, and the region is the first thing
       returned rather than the last: it used to sit after the list, behind the early return that a
       search to nothing takes, so the region that would have said "no cards" was the one thing the
       empty list unmounted. */
    const announcement = pending
        ? "Loading more cards…"
        : total === 0
          ? narrowed
              ? "No cards found."
              : ""
          : `Showing ${formatCount(cards.length)} of ${formatCount(total)} cards`;

    /* Moving it above the early return is not enough on its own. `binder-body.tsx` keys the whole
       view on the list's URL, so a search does not update this component, it replaces it, and a
       live region that arrives with its text already in it is never read out. Where the reader
       changed this list (`changed`), the region is therefore mounted empty and the sentence written a
       beat later, so what a screen reader sees is a region that was already standing and then
       changed. A plain effect is not enough either: React commits the insert and the text in one
       batch, which is one mutation record and one region-with-content again. Arriving at a list
       writes the count straight away instead, so landing somewhere is not narrated; the node then
       stays put, and Show more speaks by changing it.

       Changed, not narrowed: it used to ask "is this list filtered", which is the wrong question:
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
            {total === 0 ? (
                <div className="flex flex-1 flex-col">{narrowed ? noHits : empty}</div>
            ) : (
                <>
                    {view === "grid" ? (
                        <div className="flex flex-col gap-8">
                            {groups.map((group, i) => (
                                /* By name and which run of that name it is, not by place: two sets can share a name (an
                                   English and a Japanese one) and come apart in the list, which gave two sections one key.
                                   Place alone moved every section after a set that emptied (its last card removed from the
                                   sheet) to another key, and each tile under it was drawn anew, its arrival played again. */
                                <section key={runKey(groups, i)} aria-labelledby={group.name ? headingId(group.name, i) : undefined}>
                                    {group.name ? (
                                        /* Sticky, so the set a tile belongs to is still readable halfway down a
                                           long one. `top-0` against the page's own scroll: this list has no
                                           scroller of its own, and `bg-page` because the band passes over the
                                           page's ground, which is the neutral tint and not white. */
                                        <h2 id={headingId(group.name, i)} className="sticky top-0 z-10 mb-3 bg-page py-2 text-sm font-semibold text-primary">
                                            {group.name} {/* The last set drawn may go on in the next batch: its count waits until it is whole. */}
                                            {more && i === groups.length - 1 ? null : (
                                                <span className="font-normal text-tertiary">
                                                    {group.cards.length} {group.cards.length === 1 ? "card" : "cards"}
                                                </span>
                                            )}
                                        </h2>
                                    ) : null}
                                    <CardsGrid
                                        cards={group.cards}
                                        onSelect={selectFromList}
                                        size={size}
                                        // The wishlist's tiles carry the pink heart and "Got it", every other list a minus and a
                                        // plus: the list says which list it is, rather than the grid reading it off a card's fields.
                                        action={filter.wishlist ? wishActions : undefined}
                                        steps={!filter.wishlist}
                                        // The first row at load is the first set's; a later set's tiles, and a batch appended on scroll, load as they come in.
                                        priority={i === 0 ? Math.min(FIRST_ROW, first.cards.length) : 0}
                                        firstPage={firstPageIds}
                                    />
                                </section>
                            ))}
                        </div>
                    ) : (
                        <CardsTable cards={cards} onSelect={onSelect} />
                    )}
                    {/* The skeleton is the page's first load and nothing after it: a further batch shows the button's
                        own spinner, so the grid does not draw a second set of empty tiles under the cards already in.
                        Where the next batch is asked for. Also the manual way in: a browser without the observer, or a
                        reader who would rather press. One button through loading and failure alike, so a keyboard
                        that pressed it keeps its place; it unmounts only when the last card is in. */}
                    {more ? (
                        <div ref={sentinel} className="flex flex-col items-center gap-3 py-2">
                            {failed ? <p className="text-sm text-tertiary">The next cards did not load.</p> : null}
                            <Button
                                color={failed ? "secondary" : "tertiary"}
                                size="sm"
                                onClick={loadMore}
                                aria-disabled={busy || undefined}
                                isLoading={busy}
                                showTextWhileLoading
                            >
                                {pending ? "Loading…" : failed ? "Try again" : "Show more"}
                            </Button>
                        </div>
                    ) : null}
                </>
            )}
        </>
    );
}

/**
 * A wishlist tile's button: Got it. The heart is a mark on the picture now (card-marks.tsx), not a
 * button: the sheet's menu takes a wish off. One function for the module, so a memoised tile is not
 * drawn again for a new one.
 */
const wishActions = (card: Card) => <GotItButton card={card} />;

/**
 * The cards in the runs the list already arrives in, one per set, or the whole list in one
 * unnamed run when it is sorted by something else.
 *
 * Runs, not a group-by: "Set" is the API's own order and a set appears once, so walking the
 * list keeps that order and cannot invent a second heading for a set further down. A card
 * whose set the catalogue could not name joins the run above it rather than opening one of
 * its own, which is where a blank heading came from.
 */
export function setGroups(cards: Card[], grouped: boolean): { name: string | null; cards: Card[] }[] {
    if (!grouped) return [{ name: null, cards }];
    const runs: { name: string | null; cards: Card[] }[] = [];
    for (const card of cards) {
        const name = card.set_name || null;
        const last = runs.at(-1);
        if (last && (name === null || last.name === name)) last.cards.push(card);
        else runs.push({ name, cards: [card] });
    }
    return runs;
}

/** A run's key: its set's name and how many runs of that name come before it, so a run keeps its key when another one goes. */
export const runKey = (groups: { name: string | null }[], at: number): string =>
    `${groups[at]?.name ?? ""}#${groups.slice(0, at).filter((g) => g.name === groups[at]?.name).length}`;

/** A heading's id, for the section that names it: one per set name, stable across renders. */
const headingId = (setName: string, at: number): string => `set-${at}-${setName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
