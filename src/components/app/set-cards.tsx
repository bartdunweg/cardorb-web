"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SearchLg, SwitchVertical01 } from "@untitledui/icons";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { arriveDelay } from "@/components/app/arrive-stagger";
import { awaitRows, knownRows, warmCardFacts, warmSetRows } from "@/components/app/card-memo";
import { type FilterAnswer, type FilterValues, FiltersSheet } from "@/components/app/filters-sheet";
import { RowButton } from "@/components/app/row-button";
import { LIST_ROW, RowSearch } from "@/components/app/row-search";
import { SetCardTile } from "@/components/app/set-card-tile";
import { useSetLive } from "@/components/app/set-live";
import { ViewMenu } from "@/components/app/view-menu";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { useCardsView } from "@/hooks/use-cards-view";
import type { SetCard } from "@/lib/api-shapes";
import { pokemonCardFromSetCard } from "@/lib/card-shapes";
import type { Card } from "@/lib/cards";
import { type CardsSize, GRID_COLUMNS } from "@/lib/cards-view";
import { FULL_ART, setFullArt } from "@/lib/full-art";
import { listRows } from "@/lib/reads";
import { type Sent, heard, wrote } from "@/lib/search-echo";
import { holdingKey } from "@/lib/set-holding";
import { SET_SORTS, type SetHolding, type SetQuery, readSetQuery, writeSetQuery } from "@/lib/set-query";

// The card sheet, fetched on the tap that opens it: it is the app's largest client chunk and the
// grid is drawn long before anyone touches a tile. `ssr: false`: the sheet is nothing until then.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

/**
 * A set's cards, and the sheet a tap opens.
 *
 * The tiles were menu buttons: tapping a card answered with a list of things to do to it and
 * never with the card. Every other list in this app opens the sheet, so this one does too.
 *
 * A card you hold opens on its own row, the same way the Pokédex does it: the row carries the
 * copies, the price you paid and the binder, none of which the catalogue knows. A card you do
 * not hold has no row, so it opens on what the set page already has: the printing, read-only,
 * with its price line. Adding it is the plus and the menu beside it, which is where it was.
 *
 * Above the grid, the row every list in the app has, in the shape they all have it: the field you
 * type in, then Filters and Sort as the same two buttons, with the filters themselves in the sheet
 * behind the first on a phone and in the row itself from lg. Two controls of different heights beside each other was the reason to follow
 * that pattern rather than invent a row for this page.
 *
 * It narrows the cards the page already holds, with the choices in the URL (`@/lib/set-query`) so
 * a refresh or a shared link opens the set as it was left: a set is one page of at most a few
 * hundred cards and the question is "where is Charizard" or "what am I missing", not a query the
 * server should re-run. Search matches the name, the printed name and the number;
 * what you hold is the tab bar over the row, with a count on each; the sheet keeps the rarity and
 * full art; the sort is the set's own order, the name or the price. A search that finds nothing keeps the row where it is and says so under it.
 */
/** The page's filters from what the sheet chose. */
const filtersOf = (v: FilterValues) => ({
    rarity: v.rarity ?? [],
    art: (v.only ?? []).includes(FULL_ART),
});
/* The tabs over the row, in the owner's order. Missing is neither held nor wished for, so the three
   after All add up to it. */
const HOLDINGS: { value: SetHolding | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "wishlist", label: "Wishlisted" },
    { value: "owned", label: "Owned" },
    { value: "missing", label: "Missing" },
];

/**
 * Cards drawn per batch: eight rows of the widest grid, twenty-four on a phone's two columns.
 *
 * A set page drew every card at once: 259 tiles for Scarlet & Violet, 1.5 MB of their markup and
 * some 10,000 elements in the page (measured 2026-09-14, at 5.8 KB a tile), for a phone that shows
 * six. The card data came over anyway and is a tenth of that; the tiles are drawn a batch at a time,
 * a screen ahead of the sentinel, as the Browse shelf (sets-shelf.tsx) and the Pokédex draw theirs.
 * Search, filters and sort still read every card: only the drawing is in batches.
 */
const CARD_BATCH = 48;

export function SetCards({
    cards: drawnCards,
    language = "en",
    firstRow = 6,
    initialSize = "md",
}: {
    cards: SetCard[];
    language?: string;
    firstRow?: number;
    /** The size the cookie holds, for the first paint; the View menu changes it (use-cards-view). */
    initialSize?: CardsSize;
}) {
    /* The tile size every other list has in its View menu, and the same choice: a set has no table, so size alone. */
    const { size } = useCardsView("grid", initialSize);
    /* The cards as the tiles show them: what the server drew, with every press since laid over it
       (`SetLive`). The tabs, their counts and the sheet read these, so a heart pressed a moment ago
       is counted under Wishlisted and opens on the wish. */
    const { live, report, outsideCount } = useSetLive();
    const cards = useMemo(() => drawnCards.map(live), [drawnCards, live]);
    const drawnById = useMemo(() => new Map(drawnCards.map((c) => [c.id, c])), [drawnCards]);
    /* The choices live in the URL (`@/lib/set-query`), written with the history API rather than the
       router: the cards are in hand, and a router write would run the server page again, which pages
       through the whole set (getSet). The router still sees the write, so `useSearchParams` follows
       it, and a refresh or a shared link opens the set as it was left, as every other list does. */
    const pathname = usePathname();
    const params = useSearchParams();
    const query = useMemo(() => readSetQuery(params), [params]);
    const { holding, rarity, fullArt: art, sort } = query;
    const write = useCallback(
        (patch: Partial<SetQuery>) => {
            const next = writeSetQuery(params, { ...readSetQuery(params), ...patch }).toString();
            window.history.replaceState(null, "", next ? `${pathname}?${next}` : pathname);
        },
        [params, pathname],
    );
    /* The field is its own state, so a keystroke lands at once; the URL follows a moment later, the
       way a binder's search field writes it (cards-search.tsx). */
    const [q, setQ] = useState(query.q);
    /* And the field follows the URL: Back moved the list and left the old term in the box, and the
       effect under this wrote it back a moment later. Reset during render, the shape React asks for
       and the one a binder's field (cards-search.tsx) already uses. */
    /* The URL coming back with a term the field wrote itself is not news: taking it put that older
       term back over what was typed since, as it did in a binder's field (cards-search.tsx). */
    const [sent, setSent] = useState<Sent>([]);
    const [fromUrl, setFromUrl] = useState(query.q);
    if (fromUrl !== query.q) {
        setFromUrl(query.q);
        const next = heard(sent, query.q);
        setSent(next.sent);
        if (next.take) setQ(query.q);
    }
    useEffect(() => {
        if (q.trim() === query.q.trim()) return;
        const id = setTimeout(() => {
            setSent((terms) => wrote(terms, q.trim()));
            write({ q });
        }, 250);
        return () => clearTimeout(id);
    }, [q, query.q, write]);
    /* Which of this set's cards are full art: the API's own flag where the answer carries it, which
       is one rule in one place for the web and the iOS app, and the web's older rule read off the
       whole set only for a card without it (`@/lib/full-art`). A set with none never offers the
       option, which is most sets before Black & White. It is a filter of its own and not an entry
       among the rarities, because it cuts across them: every special illustration rare is a full
       art, and listed with them it put one card under two rarities. */
    const fullArt = useMemo(() => setFullArt(drawnCards), [drawnCards]);
    /* Every card's facts, a page of them per request, once the grid is up: a sheet opened on any card
       then draws its choices on its first paint (card-memo.ts). The whole set rather than the tiles
       drawn, because the sheet's arrows go past those. Asked of the set's own catalogue. */
    useEffect(() => {
        if (language === "en" || language === "ja")
            warmCardFacts(
                drawnCards.map((c) => c.tcgId),
                language,
            );
    }, [drawnCards, language]);
    /* Your rows in this set, one request for the page, each time the page is drawn: a sheet opened on
       a card you hold or wish for then opens on its row, with its copies, rather than on the
       catalogue's card with the rows read after the tap (card-memo.ts). Only a set you have a row in;
       the cards are the drawing, so a refresh asks again and a second run of the effect does not. */
    const setName = drawnCards[0]?.setName;
    const searchLabel = setName ? `Search in ${setName}` : "Search this set";
    useEffect(() => {
        if (setName && drawnCards.some((c) => c.owned || c.wishlist)) warmSetRows(setName, drawnCards);
    }, [drawnCards, setName]);
    const rarities = useMemo(
        () => [...new Set(drawnCards.map((c) => c.rarity).filter((r): r is string => Boolean(r)))].sort().map((r) => ({ value: r, label: r })),
        [drawnCards],
    );
    /* The grid follows the field when React has a moment: a keystroke draws the letter first, then
       the tiles, rather than waiting on a grid and its counts to be worked out again. */
    const needle = useDeferredValue(q);
    /* One test for the grid and for the sheet's count, so "Show 12 cards" is the twelve it shows. */
    const matching = useCallback(
        (f: { holding?: SetHolding; rarity: string[]; art: boolean }, keep?: ReadonlySet<string>) => {
            const term = needle.trim().toLowerCase();
            return cards.filter(
                (c) =>
                    (!term ||
                        c.name.toLowerCase().includes(term) ||
                        (c.localName ?? "").toLowerCase().includes(term) ||
                        c.number.toLowerCase().includes(term)) &&
                    (!f.holding || keep?.has(c.id) || (f.holding === "owned" ? c.owned : f.holding === "wishlist" ? c.wishlist : !c.owned && !c.wishlist)) &&
                    (f.rarity.length === 0 || (c.rarity !== null && c.rarity !== undefined && f.rarity.includes(c.rarity))) &&
                    (!f.art || fullArt.has(c.number)),
            );
        },
        [cards, needle, fullArt],
    );
    const view = `${needle}\u0000${holding ?? ""}\u0000${rarity.join(",")}\u0000${art}\u0000${sort}`;
    /* The cards pressed on in this view stay in it: a plus under Missing would otherwise take the
       tile away under the thumb that is about to press it again. A new view sorts them where they go. */
    const [touched, setTouched] = useState<{ view: string; ids: ReadonlySet<string> }>({ view, ids: new Set() });
    const keep = touched.view === view ? touched.ids : undefined;
    const shown = useMemo(() => {
        const kept = matching({ holding, rarity, art }, keep);
        if (sort === "set") return kept;
        /* A card without a price sorts last either way: the question is which cards are worth what, and
           an unpriced card has no answer to give. */
        const price = (c: SetCard) => c.price ?? (sort === "price-desc" ? -1 : Number.POSITIVE_INFINITY);
        return [...kept].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "price-desc" ? price(b) - price(a) : price(a) - price(b)));
    }, [matching, holding, rarity, art, sort, keep]);
    const narrowed = Boolean(needle.trim() || holding || rarity.length || art);
    /* How many of `shown` are drawn. Kept with the view it was counted for, so a new search, filter
       or sort starts again at one batch without an effect to reset it. */
    const [drawn, setDrawn] = useState({ view, count: CARD_BATCH });
    const limit = drawn.view === view ? drawn.count : CARD_BATCH;
    const drawUpTo = useCallback((count: number) => setDrawn({ view, count }), [view]);
    const more = limit < shown.length;
    const sentinel = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sentinel.current;
        if (!el || !more || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                observer.disconnect();
                drawUpTo(limit + CARD_BATCH);
            },
            { rootMargin: "100% 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [more, limit, drawUpTo]);
    /* What each choice would leave, worked out here from the set in hand: a group's numbers with every
       other filter as chosen and its own left off, the way the API counts a binder's. */
    const countDraft = useCallback(
        (v: FilterValues): FilterAnswer => {
            const f = filtersOf(v);
            const tally = (cards: SetCard[], key: (c: SetCard) => string | null | undefined) => {
                const out: Record<string, number> = {};
                for (const c of cards) {
                    const k = key(c);
                    if (k) out[k] = (out[k] ?? 0) + 1;
                }
                return out;
            };
            const withTab = { ...f, holding };
            return {
                total: matching(withTab).length,
                options: {
                    rarity: tally(matching({ ...withTab, rarity: [] }), (c) => c.rarity),
                    only: { [FULL_ART]: matching({ ...withTab, art: true }).length },
                },
            };
        },
        [matching, holding],
    );
    /* Each tab's count under the search and the sheet's filters, so a tab says what it would show. */
    const tabCounts = useMemo(() => {
        const f = { rarity, art };
        return Object.fromEntries(HOLDINGS.map((h) => [h.value, matching({ ...f, holding: h.value === "all" ? undefined : h.value }).length]));
    }, [matching, rarity, art]);

    const [selected, setSelected] = useState<Card | null>(null);
    /* The card you hold or wish for, open while its row is still on the way (its catalogue id): the
       sheet holds the place of the copies rather than offering to add a card you already have. */
    const [pendingId, setPendingId] = useState<string | null>(null);
    // The catalogue card behind an open sheet, so a card nobody holds can still be taken from it.
    const [addable, setAddable] = useState<SetCard | null>(null);
    /* Where in the set the open card is, so the sheet can offer the one either side. The set page
       had no arrows at all: you left the sheet, found the next card and opened it again, on a page
       whose whole point is going through a set in order. */
    const [at, setAt] = useState(-1);
    // The card the sheet is on, so what the sheet does to it reaches its tile and the counts.
    const [openId, setOpenId] = useState<string | null>(null);
    const open = async (card: SetCard) => {
        setOpenId(card.id);
        const index = shown.findIndex((c) => c.id === card.id);
        setAt(index);
        // The sheet's arrows can go past the cards drawn; draw them, so closing it lands on a tile.
        if (index >= limit) drawUpTo(index + CARD_BATCH);
        /* The card you hold opens on its row, from the page's rows where they are in (warmSetRows):
           then everything the sheet offers is right on its first paint. Otherwise the catalogue's own
           is shown while the row is read, so the sheet is never blank waiting for it, and a read that
           lands after another card was opened (an arrow pressed meanwhile) opens nothing. */
        const name = { set: card.setName, number: card.number, name: card.name, tcg_id: card.tcgId };
        // The row stores one name, the English one; the printed name is the shelf's to tell.
        const onRow = (row: Card) => ({ ...row, local_name: card.localName });
        const held = card.owned || card.wishlist;
        // The rows read with the page say nothing of a card pressed on since; that one is asked for.
        const pressed = !drawnCards.includes(card);
        const known = held && !pressed ? knownRows(name)?.[0] : undefined;
        setAddable(held ? null : card);
        setPendingId(held && !known ? card.id : null);
        setSelected(known ? onRow(known) : fromCatalogue(card));
        if (!held || known) return;
        const row = (pressed ? undefined : (await awaitRows(name))?.[0]) ?? (await listRows(name))[0];
        /* No row yet: a tile's own add is still in the air. The sheet stays pending and reads again
           once the tile has its row (the effect below), rather than settling on a card with no copies
           and no way to take it. */
        if (!row) return;
        // Only onto the sheet still showing this card, not one opened or closed since.
        setPendingId((id) => (id === card.id ? null : id));
        setSelected((shown) => (shown?.id === card.id ? onRow(row) : shown));
    };

    /* Null rather than a dead button at either end: the sheet draws no arrow where there is
       nothing to go to, the same rule the card lists follow. */
    const step = (by: number) => {
        const next = at >= 0 ? shown[at + by] : undefined;
        return next ? () => void open(next) : null;
    };

    return (
        <>
            <Tabs
                className="flex flex-1 flex-col gap-6"
                selectedKey={holding ?? "all"}
                onSelectionChange={(key) => write({ holding: key === "all" ? undefined : (key as SetHolding) })}
            >
                {/* The kit's underline tabs, as the card sheet has them; scrolls sideways on a phone too narrow for four.
                    `overflow-x` alone makes the other way `auto` as well, which cut the top pixel off every count
                    badge (they carry `-my-px`, so they stand a pixel outside the tab and their ring read as sliced).
                    The pixel back as padding, and off again as margin, so nothing else moves. */}
                <div className="-mx-4 -mt-px overflow-x-auto px-4 pt-px sm:mx-0 sm:px-0">
                    <TabList aria-label="Cards in this set" type="underline" size="sm" className="min-w-max">
                        {HOLDINGS.map((h) => (
                            <Tab key={h.value} id={h.value} label={h.label} badge={String(tabCounts[h.value] ?? 0)} />
                        ))}
                    </TabList>
                </div>
                {/* The whole first line on a phone, a short field from sm (`RowSearch`), as in a binder's row. */}
                <div className={LIST_ROW}>
                    <RowSearch>
                        <Input
                            size="sm"
                            icon={SearchLg}
                            aria-label={searchLabel}
                            placeholder={searchLabel}
                            value={q}
                            onChange={setQ}
                            // What the URL keeps (readSetQuery); longer, the two would disagree for good.
                            maxLength={100}
                            wrapperClassName="rounded-full"
                        />
                    </RowSearch>
                    <FiltersSheet
                        inline
                        noun={["card", "cards"]}
                        groups={[
                            ...(rarities.length > 1 ? [{ id: "rarity", label: "Rarity", multiple: true, options: rarities }] : []),
                            // Full art cuts across the rarities, so it is its own yes-or-no, not one of them.
                            ...(fullArt.size > 0
                                ? [{ id: "only", label: "Show only", multiple: true, options: [{ value: FULL_ART, label: "Full art" }] }]
                                : []),
                        ]}
                        values={{ rarity, only: art ? [FULL_ART] : [] }}
                        count={countDraft}
                        onApply={(v) => {
                            const next = filtersOf(v);
                            write({ rarity: next.rarity, fullArt: next.art });
                        }}
                    />
                    <Dropdown.Root>
                        <RowButton icon={SwitchVertical01} label="Sort" />
                        <Dropdown.Popover placement="bottom end" className="w-56">
                            <Dropdown.Menu
                                selectionMode="single"
                                disallowEmptySelection
                                selectedKeys={new Set([sort])}
                                onSelectionChange={(keys) => {
                                    const key = keys === "all" ? undefined : [...keys][0];
                                    write({ sort: SET_SORTS.find((o) => o.value === key)?.value ?? "set" });
                                }}
                            >
                                {SET_SORTS.map((o) => (
                                    <Dropdown.Item key={o.value} id={o.value}>
                                        {o.label}
                                    </Dropdown.Item>
                                ))}
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                    <ViewMenu view="grid" size={size} layouts={false} />
                </div>
                {/* One panel, named after the tab chosen: the grid is the same list filtered, not four lists. */}
                <TabPanel id={holding ?? "all"} className="flex flex-col gap-6">
                    {shown.length === 0 && narrowed ? (
                        <AppEmptyState
                            icon="search"
                            title="No cards found"
                            description={
                                needle.trim()
                                    ? `No cards in this set match “${needle.trim()}”.`
                                    : "Nothing in this set with those filters. Clear one to widen the list."
                            }
                        />
                    ) : (
                        /* The same grid as every other overview, at the same size: a set was denser than any
                   list in the app, which is what made it read as a checklist rather than a shelf. */
                        <ul className={`grid gap-4 ${GRID_COLUMNS[size]}`}>
                            {shown.slice(0, limit).map((card, i) => (
                                // The first batch arrives in a wave; a batch drawn on scroll comes in at once.
                                <li key={card.id} className="arrive" style={{ "--arrive-delay": arriveDelay(i, i < CARD_BATCH) } as React.CSSProperties}>
                                    <SetCardTile
                                        card={card}
                                        stamp={`${holdingKey(drawnById.get(card.id) ?? card)}#${outsideCount(drawnById.get(card.id) ?? card)}`}
                                        onChange={(patch) => {
                                            const drawnCard = drawnById.get(card.id);
                                            if (drawnCard) report(drawnCard, patch);
                                            /* A sheet opened on this card while its add was in the air is waiting for
                                               the row: open it again once the tile has one, or once the write failed
                                               and the card is not held after all. */
                                            if (drawnCard && pendingId === card.id) {
                                                const now = { ...live(drawnCard), ...patch };
                                                if (now.itemIds[0] || !(now.owned || now.wishlist)) void open(now);
                                            }
                                            setTouched((t) => ({ view, ids: new Set(t.view === view ? t.ids : []).add(card.id) }));
                                        }}
                                        language={language}
                                        size={size}
                                        priority={i < firstRow}
                                        onOpen={open}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                    {more && shown.length > 0 ? (
                        <div ref={sentinel} className="flex justify-center py-2">
                            {/* The way on when the sentinel is never seen: a keyboard, or an observer the
                        browser does not have. The kit's quietest button, as the shelf has it. */}
                            <Button color="link-gray" size="sm" className="hit-area" onClick={() => drawUpTo(limit + CARD_BATCH)}>
                                Show more
                            </Button>
                        </div>
                    ) : null}
                </TabPanel>
            </Tabs>
            {/* Outside the Tabs: inside them the sheet's own tabs (Your copies, Details, Price) were
                counted into the page's tab list and drawn beside All, Owned and Missing, and the sheet
                opened with none (2026-09-15). The sheet is a portal, so where it sits changes no layout. */}
            {/* A card you hold opens on its row and can be changed. One you do not opens on the
                printing, with the two ways to take it; the sheet is where you looked for them. */}
            <CardDetailSlideout
                card={selected}
                onClose={() => {
                    setSelected(null);
                    setAddable(null);
                    setPendingId(null);
                    setAt(-1);
                    setOpenId(null);
                }}
                addable={addable ? pokemonCardFromSetCard(addable, language) : null}
                /* The printing the tile showed, so a card you do not hold opens on it (printing-choices.ts). */
                printing={addable?.printing ?? null}
                /* The sheet writes without drawing the page again; the tile and the counts are told here. */
                onTaking={(taken, list) => {
                    const drawnCard = drawnById.get(taken.id);
                    if (!drawnCard) return;
                    const before = live(drawnCard);
                    // Held at once, with no row yet: the tile's buttons cannot write a second row meanwhile.
                    report(
                        drawnCard,
                        list === "wishlist"
                            ? { wishlist: true, owned: false, quantity: 0, itemIds: [] }
                            : { owned: true, quantity: 1, wishlist: false, itemIds: [] },
                        true,
                    );
                    return () =>
                        report(drawnCard, { owned: before.owned, quantity: before.quantity, wishlist: before.wishlist, itemIds: before.itemIds }, true);
                }}
                onTaken={(taken, list, id) => {
                    const drawnCard = drawnById.get(taken.id);
                    if (!drawnCard) return;
                    const itemIds = id ? [id] : [];
                    report(
                        drawnCard,
                        list === "wishlist" ? { wishlist: true, owned: false, quantity: 0, itemIds } : { owned: true, quantity: 1, wishlist: false, itemIds },
                        true,
                    );
                }}
                onRemoved={(row) => {
                    const drawnCard = openId ? drawnById.get(openId) : undefined;
                    if (!drawnCard) return;
                    const now = live(drawnCard);
                    const itemIds = now.itemIds.filter((i) => i !== row.id);
                    const quantity = row.owned ? Math.max(0, now.quantity - (row.quantity ?? 1)) : now.quantity;
                    report(drawnCard, { itemIds, quantity, owned: quantity > 0, wishlist: row.wishlist ? false : now.wishlist }, true);
                }}
                rowPending={!!selected && selected.id === pendingId}
                onPrev={step(-1)}
                onNext={step(1)}
            />
        </>
    );
}

/** A catalogue card as the sheet reads one: every field about a copy is empty, because there is none. */
const fromCatalogue = (c: SetCard): Card => ({
    id: c.id,
    name: c.name,
    local_name: c.localName,
    set_name: c.setName,
    set_abbr: c.setAbbr,
    set: c.setName,
    number: c.number,
    printed_number: c.printedNumber,
    rarity: c.rarity,
    gen: null,
    types: c.types,
    quantity: 0,
    owned: false,
    is_favorite: false,
    dex_face: false,
    excluded: false,
    condition: null,
    grade: null,
    language: null,
    finish: null,
    foil_pattern: null,
    edition: null,
    price_first_ed: null,
    price_source: null,
    price_printing: null,
    tcgplayer_id: null,
    purchase_price: null,
    purchase_date: null,
    acquired_at: null,
    notes: null,
    price: c.price,
    listing_price: c.listingPrice ?? null,
    image_url: c.imageUrl,
    image_high_url: c.imageHighUrl,
    tcg_id: c.tcgId ?? null,
    collection_id: null,
    wishlist: false,
    species_id: null,
});
