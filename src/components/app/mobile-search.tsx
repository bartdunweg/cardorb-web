"use client";

import { useEffect, useRef, useState } from "react";
import { Scan, SearchLg } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { type CardHit, searchMyCards } from "@/app/(app)/dashboard/cards/actions";
import { listSetsShelf } from "@/app/(app)/dashboard/sets/actions";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { CardImage } from "@/components/app/card-image";
import { LanguageChips } from "@/components/app/language-chips";
import { SetsShelfList } from "@/components/app/sets-shelf-list";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import type { BrowseLanguage } from "@/lib/languages";
import type { SetSeries } from "@/lib/sets";
import { cx } from "@/utils/cx";

// The collection search on a phone: a search-field-looking bar at the top of Home that opens a
// bottom sheet with the field and the hits. The desktop sidebar has its own trigger and palette.
export function MobileSearchSheet() {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative lg:hidden">
            <button
                type="button"
                onClick={() => setOpen(true)}
                // The kit's Input at its lg size, as a button: the same ring, padding, type and icon as the search
                // field on every folder page, so the two read as one control.
                className="flex w-full pressable cursor-pointer items-center gap-2 rounded-full bg-primary py-2.5 pr-16 pl-3.5 text-md text-placeholder ring-1 ring-primary outline-focus-ring ring-inset hover:bg-secondary focus-visible:outline-2"
            >
                <SearchLg className="size-5 text-fg-quaternary" />
                <span className="flex-1 text-left">Search a card or a set</span>
            </button>
            {/* Scan sits at the bar's right end, its own control beside the search rather than inside it
                (a button in a button is not HTML). There is no scanner yet: the button is the place for one. */}
            <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
                {/* The kit's button, so it reads as one: the same ring and press as every other control. */}
                <Button color="secondary" size="sm" iconLeading={Scan} aria-label="Scan a card" isDisabled />
            </div>
            <SlideoutMenu
                isDismissable
                isOpen={open}
                onOpenChange={setOpen}
                // The same sheet a card opens: the page's own ground, the whole screen but for the page
                // sheet's inset under the status bar.
                dialogClassName="scrollbar-hide mt-auto h-[calc(100dvh-env(safe-area-inset-top)-0.625rem)] max-h-[calc(100dvh-env(safe-area-inset-top)-0.625rem)] bg-page backdrop-blur-none sm:h-full sm:max-h-full"
            >
                {({ close }) => <CollectionSearch onClose={close} />}
            </SlideoutMenu>
        </div>
    );
}

// The sheet's inside. Mounted with the sheet, so the field starts empty every time.
function CollectionSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState("");
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
    const { results, loading } = useDebouncedSearch<CardHit>(query, searchMyCards, { minLength: 1, delay: 250 });
    const searchState = loading ? "Searching…" : query.trim().length >= 1 && results.length === 0 ? "No cards found." : "";

    return (
        <>
            <SlideoutMenu.Header onClose={onClose} className="flex flex-col gap-3 pr-14">
                {/* The field is the title; the word stays for a screen reader, which names the dialog by it. */}
                <AriaHeading slot="title" className="sr-only">
                    Search
                </AriaHeading>
                <Input
                    aria-label="Search a card"
                    icon={SearchLg}
                    placeholder="Search a card…"
                    value={query}
                    onChange={setQuery}
                    ref={field}
                    wrapperClassName="rounded-full"
                />
                {/* Which catalogue the shelf below shows; in the head so it stays put while the shelf scrolls. */}
                {!query.trim() ? <LanguageChips value={language} onChange={setLanguage} className="-mr-14" /> : null}
            </SlideoutMenu.Header>
            <SlideoutMenu.Content className="gap-1 pb-4">
                {/* One live region, always mounted, so a screen reader hears the state change. */}
                <output aria-live="polite" className={cx("text-center text-sm text-tertiary", searchState ? "px-1 py-6" : "sr-only")}>
                    {searchState}
                </output>
                {/* Nothing typed: the shelf of sets, series by series, so the sheet is Browse as well as search. */}
                {!query.trim() ? (
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
                        <button
                            key={card.id}
                            type="button"
                            onClick={() => setSelected(card)}
                            className="flex pressable items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary"
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
                        </button>
                    ))}
            </SlideoutMenu.Content>
            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} />
        </>
    );
}
