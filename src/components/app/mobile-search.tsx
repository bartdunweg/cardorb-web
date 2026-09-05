"use client";

import { useEffect, useRef, useState } from "react";
import { Scan, SearchLg } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { type CardHit, searchMyCards } from "@/app/(app)/dashboard/cards/actions";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { CardImage } from "@/components/app/card-image";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Input } from "@/components/base/input/input";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
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
                className="flex w-full pressable cursor-pointer items-center gap-3 rounded-full bg-primary py-3 pr-16 pl-4 text-md text-tertiary ring-1 ring-primary outline-focus-ring ring-inset hover:bg-secondary focus-visible:outline-2"
            >
                <SearchLg className="size-6 text-fg-tertiary" />
                <span className="flex-1 text-left">Search a card</span>
            </button>
            {/* Scan sits at the bar's right end, its own control beside the search rather than inside it
                (a button in a button is not HTML). There is no scanner yet: the button is the place for one. */}
            <button
                type="button"
                aria-label="Scan a card"
                aria-disabled="true"
                className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-tertiary text-fg-secondary outline-focus-ring hover:bg-quaternary focus-visible:outline-2"
            >
                <Scan className="size-5" />
            </button>
            <SlideoutMenu isDismissable isOpen={open} onOpenChange={setOpen}>
                {({ close }) => <CollectionSearch onClose={close} />}
            </SlideoutMenu>
        </div>
    );
}

// The sheet's inside. Mounted with the sheet, so the field starts empty every time.
function CollectionSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<CardHit | null>(null);
    const field = useRef<HTMLInputElement>(null);
    // The sheet exists to type into: the tap on Search lands the caret in the field.
    useEffect(() => field.current?.focus(), []);
    const { results, loading } = useDebouncedSearch<CardHit>(query, searchMyCards, { minLength: 1, delay: 250 });
    const searchState = loading ? "Searching…" : query.trim().length >= 1 && results.length === 0 ? "No cards found." : "";

    return (
        <>
            <SlideoutMenu.Header onClose={onClose} className="flex flex-col gap-3">
                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
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
            </SlideoutMenu.Header>
            <SlideoutMenu.Content className="gap-1 pb-4">
                {/* One live region, always mounted, so a screen reader hears the state change. */}
                <output aria-live="polite" className={cx("text-center text-sm text-tertiary", searchState ? "px-1 py-6" : "sr-only")}>
                    {searchState}
                </output>
                {!loading &&
                    results.map((card) => (
                        <button
                            key={card.id}
                            type="button"
                            onClick={() => setSelected(card)}
                            className="flex pressable items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary"
                        >
                            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-quaternary ring-1 ring-image ring-inset">
                                {card.image_url ? <CardImage src={card.image_url} alt="" sizes="40px" className="object-cover" /> : null}
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
