"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchLg, SwitchVertical01 } from "@untitledui/icons";
import dynamic from "next/dynamic";
import { listRows } from "@/app/(app)/dashboard/cards/actions";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { type FilterAnswer, type FilterValues, FiltersSheet } from "@/components/app/filters-sheet";
import { RowButton } from "@/components/app/row-button";
import { LIST_ROW, RowSearch } from "@/components/app/row-search";
import { SetCardTile } from "@/components/app/set-card-tile";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { type SetCard, pokemonCardFromSetCard } from "@/lib/api-shapes";
import type { Card } from "@/lib/cards";
import { GRID_COLUMNS } from "@/lib/cards-view";
import { FULL_ART, setFullArt } from "@/lib/full-art";

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
 * copies, the price you paid and the folder, none of which the catalogue knows. A card you do
 * not hold has no row, so it opens on what the set page already has: the printing, read-only,
 * with its price line. Adding it is the plus and the menu beside it, which is where it was.
 *
 * Above the grid, the row every list in the app has, in the shape they all have it: the field you
 * type in, then Filters and Sort as the same two buttons, with the filters themselves in the sheet
 * behind the first on a phone and in the row itself from lg. Two controls of different heights beside each other was the reason to follow
 * that pattern rather than invent a row for this page.
 *
 * It works on the cards the page already holds rather than on the URL, because a set is one page
 * of at most a few hundred cards and the question is "where is Charizard" or "what am I missing",
 * not a query the server should re-run. Search matches the name, the printed name and the number;
 * what you hold is the tab bar over the row, with a count on each; the sheet keeps the rarity and
 * full art; the sort is the set's own order, the name or the price. A search that finds nothing keeps the row where it is and says so under it.
 */
type Holding = "owned" | "missing" | "wishlist";
/** The page's filters from what the sheet chose. */
const filtersOf = (v: FilterValues) => ({
    rarity: v.rarity ?? [],
    art: (v.only ?? []).includes(FULL_ART),
});
type SortKey = "set" | "name" | "price-desc" | "price-asc";
const SORTS: { value: SortKey; label: string }[] = [
    { value: "set", label: "Set order" },
    { value: "name", label: "Name" },
    { value: "price-desc", label: "Price, high to low" },
    { value: "price-asc", label: "Price, low to high" },
];
/* The tabs over the row, in the owner's order. Missing is neither held nor wished for, so the three
   after All add up to it. */
const HOLDINGS: { value: Holding | "all"; label: string }[] = [
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

export function SetCards({ cards, language = "en", firstRow = 6 }: { cards: SetCard[]; language?: string; firstRow?: number }) {
    const [q, setQ] = useState("");
    const [holding, setHolding] = useState<Holding | undefined>();
    const [rarity, setRarity] = useState<string[]>([]);
    const [art, setArt] = useState(false);
    const [sort, setSort] = useState<SortKey>("set");
    /* Which of this set's cards are full art: the API's own flag where the answer carries it, which
       is one rule in one place for the web and the iOS app, and the web's older rule read off the
       whole set only for a card without it (`@/lib/full-art`). A set with none never offers the
       option, which is most sets before Black & White. It is a filter of its own and not an entry
       among the rarities, because it cuts across them: every special illustration rare is a full
       art, and listed with them it put one card under two rarities. */
    const fullArt = useMemo(() => setFullArt(cards), [cards]);
    const rarities = useMemo(
        () => [...new Set(cards.map((c) => c.rarity).filter((r): r is string => Boolean(r)))].sort().map((r) => ({ value: r, label: r })),
        [cards],
    );
    /* One test for the grid and for the sheet's count, so "Show 12 cards" is the twelve it shows. */
    const matching = useCallback(
        (f: { holding?: Holding; rarity: string[]; art: boolean }) => {
            const term = q.trim().toLowerCase();
            return cards.filter(
                (c) =>
                    (!term ||
                        c.name.toLowerCase().includes(term) ||
                        (c.localName ?? "").toLowerCase().includes(term) ||
                        c.number.toLowerCase().includes(term)) &&
                    (!f.holding || (f.holding === "owned" ? c.owned : f.holding === "wishlist" ? c.wishlist : !c.owned && !c.wishlist)) &&
                    (f.rarity.length === 0 || (c.rarity !== null && c.rarity !== undefined && f.rarity.includes(c.rarity))) &&
                    (!f.art || fullArt.has(c.number)),
            );
        },
        [cards, q, fullArt],
    );
    const shown = useMemo(() => {
        const kept = matching({ holding, rarity, art });
        if (sort === "set") return kept;
        /* A card without a price sorts last either way: the question is which cards are worth what, and
           an unpriced card has no answer to give. */
        const price = (c: SetCard) => c.price ?? (sort === "price-desc" ? -1 : Number.POSITIVE_INFINITY);
        return [...kept].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "price-desc" ? price(b) - price(a) : price(a) - price(b)));
    }, [matching, holding, rarity, art, sort]);
    const narrowed = Boolean(q.trim() || holding || rarity.length || art);
    /* How many of `shown` are drawn. Kept with the view it was counted for, so a new search, filter
       or sort starts again at one batch without an effect to reset it. */
    const view = `${q}\u0000${holding ?? ""}\u0000${rarity.join(",")}\u0000${art}\u0000${sort}`;
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
    // The catalogue card behind an open sheet, so a card nobody holds can still be taken from it.
    const [addable, setAddable] = useState<SetCard | null>(null);
    /* Where in the set the open card is, so the sheet can offer the one either side. The set page
       had no arrows at all: you left the sheet, found the next card and opened it again, on a page
       whose whole point is going through a set in order. */
    const [at, setAt] = useState(-1);
    const open = async (card: SetCard) => {
        const index = shown.findIndex((c) => c.id === card.id);
        setAt(index);
        // The sheet's arrows can go past the cards drawn; draw them, so closing it lands on a tile.
        if (index >= limit) drawUpTo(index + CARD_BATCH);
        /* The card you hold opens on its row; the catalogue's own is shown while that is read, so
           the sheet is never blank waiting for it. No guard against a second tap: opening the same
           card twice costs one read and lands on the same card, and the ref that used to prevent
           it could not be reached from an arrow without being touched during render. */
        setAddable(card.owned || card.wishlist ? null : card);
        setSelected(fromCatalogue(card));
        if (!card.owned && !card.wishlist) return;
        const rows = await listRows({ set: card.setName, number: card.number, name: card.name });
        const row = rows[0];
        if (row) {
            setAddable(null);
            // The row stores one name, the English one; the printed name is the shelf's to tell.
            setSelected({ ...row, local_name: card.localName });
        }
    };

    /* Null rather than a dead button at either end: the sheet draws no arrow where there is
       nothing to go to, the same rule the card lists follow. */
    const step = (by: number) => {
        const next = at >= 0 ? shown[at + by] : undefined;
        return next ? () => void open(next) : null;
    };

    return (
        <Tabs
            className="flex flex-1 flex-col gap-6"
            selectedKey={holding ?? "all"}
            onSelectionChange={(key) => setHolding(key === "all" ? undefined : (key as Holding))}
        >
            {/* The kit's underline tabs, as the card sheet has them; scrolls sideways on a phone too narrow for four. */}
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <TabList aria-label="Cards in this set" type="underline" size="sm" className="min-w-max">
                    {HOLDINGS.map((h) => (
                        <Tab key={h.value} id={h.value} label={h.label} badge={tabCounts[h.value]} />
                    ))}
                </TabList>
            </div>
            {/* A round button on a phone, a short field from sm (`RowSearch`), as in a binder's row. */}
            <div className={LIST_ROW}>
                <RowSearch label="Search this set" filled={q !== ""}>
                    <Input
                        size="sm"
                        icon={SearchLg}
                        aria-label="Search this set"
                        placeholder="Search this set"
                        value={q}
                        onChange={setQ}
                        wrapperClassName="rounded-full"
                    />
                </RowSearch>
                <FiltersSheet
                    inline
                    noun={["card", "cards"]}
                    groups={[
                        ...(rarities.length > 1 ? [{ id: "rarity", label: "Rarity", multiple: true, options: rarities }] : []),
                        // Full art cuts across the rarities, so it is its own yes-or-no, not one of them.
                        ...(fullArt.size > 0 ? [{ id: "only", label: "Show only", multiple: true, options: [{ value: FULL_ART, label: "Full art" }] }] : []),
                    ]}
                    values={{ rarity, only: art ? [FULL_ART] : [] }}
                    count={countDraft}
                    onApply={(v) => {
                        const next = filtersOf(v);
                        setRarity(next.rarity);
                        setArt(next.art);
                    }}
                />
                <Dropdown.Root>
                    <RowButton icon={SwitchVertical01} label="Sort" menu />
                    <Dropdown.Popover placement="bottom end" className="w-56">
                        <Dropdown.Menu
                            selectionMode="single"
                            disallowEmptySelection
                            selectedKeys={new Set([sort])}
                            onSelectionChange={(keys) => {
                                const key = keys === "all" ? undefined : [...keys][0];
                                setSort(SORTS.find((o) => o.value === key)?.value ?? "set");
                            }}
                        >
                            {SORTS.map((o) => (
                                <Dropdown.Item key={o.value} id={o.value}>
                                    {o.label}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown.Popover>
                </Dropdown.Root>
            </div>
            {/* One panel, named after the tab chosen: the grid is the same list filtered, not four lists. */}
            <TabPanel id={holding ?? "all"} className="flex flex-col gap-6">
                {shown.length === 0 && narrowed ? (
                    <AppEmptyState
                        icon="search"
                        title="No cards found"
                        description={
                            q.trim() ? `No cards in this set match “${q.trim()}”.` : "Nothing in this set with those filters. Clear one to widen the list."
                        }
                    />
                ) : (
                    /* The same grid as every other overview, at the same size: a set was denser than any
                   list in the app, which is what made it read as a checklist rather than a shelf. */
                    <ul className={`grid gap-4 ${GRID_COLUMNS.md}`}>
                        {shown.slice(0, limit).map((card, i) => (
                            <li key={card.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i, 16) * 20}ms` } as React.CSSProperties}>
                                <SetCardTile card={card} language={language} priority={i < firstRow} onOpen={open} />
                            </li>
                        ))}
                    </ul>
                )}
                {more && shown.length > 0 ? (
                    <div ref={sentinel} className="flex justify-center py-2">
                        {/* The way on when the sentinel is never seen: a keyboard, or an observer the
                        browser does not have. The kit's quietest button, as the shelf has it. */}
                        <Button color="link-gray" size="sm" onClick={() => drawUpTo(limit + CARD_BATCH)}>
                            Show more
                        </Button>
                    </div>
                ) : null}
            </TabPanel>
            {/* A card you hold opens on its row and can be changed. One you do not opens on the
                printing, with the two ways to take it; the sheet is where you looked for them. */}
            <CardDetailSlideout
                card={selected}
                onClose={() => {
                    setSelected(null);
                    setAddable(null);
                    setAt(-1);
                }}
                addable={addable ? pokemonCardFromSetCard(addable, language) : null}
                onPrev={step(-1)}
                onNext={step(1)}
            />
        </Tabs>
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
    image_url: c.imageUrl,
    image_high_url: c.imageHighUrl,
    tcg_id: c.tcgId ?? null,
    collection_id: null,
    wishlist: false,
    species_id: null,
});
