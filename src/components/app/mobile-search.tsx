"use client";

import { useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { type CardHit, searchMyCards } from "@/app/(app)/dashboard/cards/actions";
import { CardDetailSlideout } from "@/components/app/card-detail-slideout";
import { CardImage } from "@/components/app/card-image";
import { Input } from "@/components/base/input/input";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import { cx } from "@/utils/cx";

// Full-page collection search for mobile (a route, not a modal).
export function MobileSearch() {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<CardHit | null>(null);
    const { results, loading } = useDebouncedSearch<CardHit>(query, searchMyCards, { minLength: 1, delay: 250 });
    const searchState = loading ? "Searching…" : query.trim().length >= 1 && results.length === 0 ? "No cards found." : "";

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-display-xs font-semibold text-primary">Search</h1>

            <Input aria-label="Search your collection" icon={SearchLg} placeholder="Search by name or set…" value={query} onChange={setQuery} />

            <div className="flex flex-col gap-1">
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
            </div>

            <CardDetailSlideout card={selected} onClose={() => setSelected(null)} />
        </div>
    );
}
