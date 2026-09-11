"use client";

import { useEffect, useRef, useState } from "react";
import { SearchLg, XClose } from "@untitledui/icons";
import dynamic from "next/dynamic";
import { Button as AriaButton, Heading as AriaHeading } from "react-aria-components";
import { type CardHit, type MyCardsFilters, searchMyCards } from "@/app/(app)/dashboard/cards/actions";
import { loadFacets } from "@/app/(app)/dashboard/collections/actions";
import { listSetsShelf } from "@/app/(app)/dashboard/sets/actions";
import { CardImage } from "@/components/app/card-image";
import { FilterChip, FilterChipRow } from "@/components/app/filter-chip";
import { LanguageFilterChip } from "@/components/app/language-filter-chip";
import { SearchTrigger } from "@/components/app/search-trigger";
import { SetsShelfList } from "@/components/app/sets-shelf-list";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import type { Facets } from "@/lib/cards";
import type { BrowseLanguage } from "@/lib/languages";
import type { SetSeries } from "@/lib/sets";
import { cx } from "@/utils/cx";

// The card sheet, fetched when a hit is tapped rather than with the page. It is the app's largest
// client chunk (the slideout, the holo card and the mark-owned dialog, ~40 KB gzip), and importing
// it here put that chunk on every page the sheet lives in — Browse and Binders among them, where no
// card sheet can open at all. `ssr: false` because the sheet only ever exists after a tap.
const CardDetailSlideout = dynamic(() => import("@/components/app/card-detail-slideout").then((m) => m.CardDetailSlideout), { ssr: false });

// The collection search on a phone: a search-field-looking bar at the top of Home that opens a
// page of its own with the field and the hits. The desktop sidebar has its own trigger and palette.
export function MobileSearchSheet() {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative lg:hidden">
            {/* The kit's Input at its lg size, as a button: the same ring, padding, type and icon as the
                search field on every folder page, so the two read as one control. The sidebar's trigger
                is the same component a size down. */}
            <SearchTrigger size="md" label="Search a card or a set" onPress={() => setOpen(true)} />
            <SlideoutMenu
                isDismissable
                isOpen={open}
                onOpenChange={setOpen}
                // The same sheet a card opens: the whole screen, edge to edge, sliding up from the bottom.
                // It used to stop short of the top by iOS' page-sheet inset, with a rounded top, and that
                // read as a bottom sheet over Home rather than a place of its own. The page's own opaque
                // ground rather than glass, as the card sheet.
                dialogClassName="scrollbar-hide h-dvh max-h-dvh rounded-none bg-page backdrop-blur-none sm:h-full sm:max-h-full"
            >
                {({ close }) => <CollectionSearch onClose={close} />}
            </SlideoutMenu>
        </div>
    );
}

// The sheet's inside. Mounted with the sheet, so the field starts empty every time.
function CollectionSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState("");
    // The chips under the field: a set and a rarity you hold, from the collection's facets, asked
    // for once something is typed, which is when the chips show.
    const [filters, setFilters] = useState<MyCardsFilters>({});
    const [facets, setFacets] = useState<Facets | null>(null);
    const filtering = Boolean(filters.set || filters.rarity);
    const searching = Boolean(query.trim()) || filtering;
    useEffect(() => {
        if (!searching || facets) return;
        let live = true;
        loadFacets().then((f) => {
            if (live) setFacets(f);
        });
        return () => {
            live = false;
        };
    }, [searching, facets]);
    const [selected, setSelected] = useState<CardHit | null>(null);
    // Every set, under an empty search: the sheet is also the way into Browse on a phone.
    const [language, setLanguage] = useState<BrowseLanguage>("en");
    const [shelf, setShelf] = useState<{ of: BrowseLanguage; series: SetSeries[]; unavailable: boolean } | null>(null);
    useEffect(() => {
        let live = true;
        listSetsShelf(language).then((r) => {
            if (live) setShelf({ of: language, ...r });
        });
        return () => {
            live = false;
        };
    }, [language]);
    const shown = shelf?.of === language ? shelf : null;
    const field = useRef<HTMLInputElement>(null);
    // The sheet exists to type into: the tap on Search lands the caret in the field.
    useEffect(() => field.current?.focus(), []);
    const { results, loading, failed, retry } = useDebouncedSearch<CardHit, MyCardsFilters>(query, searchMyCards, {
        minLength: 1,
        delay: 250,
        params: filters,
    });
    const searchState = loading ? "Searching…" : failed ? "The card service didn't answer." : searching && results.length === 0 ? "No cards found." : "";
    // Try again unmounts the button that was pressed the moment hits land, and focus would fall
    // to the page; it goes back to the field instead, where the next keystroke belongs.
    const retryAndRefocus = () => {
        retry();
        field.current?.focus();
    };

    return (
        <>
            <SlideoutMenu.Header close="none" className="flex flex-col gap-3 pt-3 sm:pt-6">
                {/* Pushed clear of the status bar, since the page runs to the top of the screen: the
                    buttons must not. Nothing on a desktop, where the inset is zero. */}
                <div aria-hidden="true" className="-mt-3 sm:hidden" style={{ height: "env(safe-area-inset-top)" }} />
                {/* The field is the title; the word stays for a screen reader, which names the dialog by it. */}
                <AriaHeading slot="title" className="sr-only">
                    Search
                </AriaHeading>
                <div className="flex items-center gap-2">
                    {/* Close at the left of the field, a round secondary button the field's height: where the
                        card sheet keeps its close, and where a thumb is. The field takes the rest of the row. */}
                    <Button color="secondary" size="md" iconLeading={XClose} aria-label="Close" className="shrink-0" onClick={onClose} />
                    <Input
                        aria-label="Search a card"
                        icon={SearchLg}
                        placeholder="Search a card…"
                        value={query}
                        onChange={setQuery}
                        ref={field}
                        className="min-w-0 flex-1"
                        wrapperClassName="rounded-full"
                    />
                </div>
                {/* Which catalogue the shelf below shows; in the head so it stays put while the shelf scrolls.
                    Once something is typed, the chips that narrow the hits take its place. */}
                {searching ? (
                    <FilterChipRow className="-mr-4 md:-mr-6" onClear={filtering ? () => setFilters({}) : undefined}>
                        <FilterChip
                            label="Set"
                            value={filters.set}
                            options={(facets?.sets ?? []).map((s) => ({ value: s.name, label: s.title }))}
                            onChange={(set) => setFilters((f) => ({ ...f, set }))}
                        />
                        <FilterChip
                            label="Rarity"
                            value={filters.rarity}
                            options={(facets?.rarities ?? []).map((r) => ({ value: r, label: r }))}
                            onChange={(rarity) => setFilters((f) => ({ ...f, rarity }))}
                        />
                    </FilterChipRow>
                ) : (
                    <FilterChipRow className="-mr-4 md:-mr-6">
                        <LanguageFilterChip value={language} onChange={setLanguage} />
                    </FilterChipRow>
                )}
            </SlideoutMenu.Header>
            {/* role="presentation", not the kit's default "main": the page already has a <main>, and a
                second unlabelled one is a landmark that leads nowhere. role={undefined} would not do it —
                the kit defaults the parameter. */}
            {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the rule offers <img alt="">, which this is not: the role is here only to stop the kit's default role="main". */}
            <SlideoutMenu.Content role="presentation" className="gap-1 pb-4">
                {/* One live region, always mounted, so a screen reader hears the state change. */}
                <output aria-live="polite" className={cx("text-center text-sm text-tertiary", searchState ? "px-1 py-6" : "sr-only")}>
                    {searchState}
                </output>
                {failed && !loading ? (
                    <Button size="sm" color="secondary" className="self-center" onClick={retryAndRefocus}>
                        Try again
                    </Button>
                ) : null}
                {/* Nothing typed and no chip set: the shelf of sets, series by series, so the sheet is Browse as well as search. */}
                {!searching ? (
                    <>
                        {shown === null ? null : shown.unavailable ? (
                            <p className="px-1 py-6 text-center text-sm text-tertiary">The list of sets is not reachable right now.</p>
                        ) : (
                            <SetsShelfList series={shown.series} language={language} onNavigate={onClose} />
                        )}
                    </>
                ) : null}
                {!loading &&
                    results.map((card) => (
                        // A hit is a row, not a tile: the picture at the left of its words, the way the
                        // palette lists them on a desktop. The kit's button (react-aria), as the chips are.
                        <AriaButton
                            key={card.id}
                            onPress={() => setSelected(card)}
                            // outline-focus-ring + focus-visible:outline-2, as every other tile and chip in
                            // the app: these rows were the one pressable of ours left on the browser's own ring.
                            className="flex pressable items-center gap-3 rounded-lg p-2 text-left outline-focus-ring transition-colors hover:bg-secondary focus-visible:outline-2"
                        >
                            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-quaternary ring-1 ring-image ring-inset">
                                {card.image_url ? <CardImage src={card.image_url} alt="" width={64} className="object-cover" /> : null}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate text-sm font-medium text-primary">{card.name}</span>
                                <span className="truncate text-xs text-tertiary">
                                    {[card.set_name, card.number ? `#${card.number}` : null].filter(Boolean).join(" · ")}
                                </span>
                            </div>
                        </AriaButton>
                    ))}
            </SlideoutMenu.Content>
            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} />
        </>
    );
}
