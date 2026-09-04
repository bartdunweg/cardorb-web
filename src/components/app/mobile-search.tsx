"use client";

import { useState } from "react";
import { SearchLg } from "@untitledui/icons";
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
        <div className="lg:hidden">
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-tertiary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset hover:bg-secondary focus-visible:outline-2"
            >
                <SearchLg className="size-5 text-fg-quaternary" />
                <span className="flex-1 text-left">Search your collection</span>
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
    const { results, loading } = useDebouncedSearch<CardHit>(query, searchMyCards, { minLength: 1, delay: 250 });
    const searchState = loading ? "Searching…" : query.trim().length >= 1 && results.length === 0 ? "No cards found." : "";

    return (
        <>
            <SlideoutMenu.Header onClose={onClose} className="flex flex-col gap-3">
                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                    Search
                </AriaHeading>
                <Input aria-label="Search your collection" icon={SearchLg} placeholder="Search by name or set…" value={query} onChange={setQuery} autoFocus />
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
                            className="flex items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary"
                        >
                            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-quaternary">
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
