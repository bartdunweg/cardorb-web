"use client";

import { useEffect, useRef, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { type CardHit, searchMyCards } from "@/app/(app)/dashboard/cards/actions";
import { CardImage } from "@/components/app/card-image";
import { Input } from "@/components/base/input/input";

// Full-page collection search for mobile (a route, not a modal).
export function MobileSearch() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CardHit[]>([]);
    const [loading, setLoading] = useState(false);
    const reqId = useRef(0);

    useEffect(() => {
        const term = query.trim();
        const id = ++reqId.current;
        // All state changes live inside the debounce timer, so none run synchronously in the effect.
        const t = setTimeout(async () => {
            if (term.length < 1) {
                setResults([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            const found = await searchMyCards(term);
            if (id === reqId.current) {
                setResults(found);
                setLoading(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [query]);

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-display-xs font-semibold text-primary">Search</h1>

            <Input aria-label="Search your collection" icon={SearchLg} placeholder="Search by name or set…" value={query} onChange={setQuery} />

            <div className="flex flex-col gap-1">
                {loading && <p className="px-1 py-6 text-center text-sm text-tertiary">Searching…</p>}
                {!loading && query.trim().length >= 1 && results.length === 0 && <p className="px-1 py-6 text-center text-sm text-tertiary">No cards found.</p>}
                {!loading &&
                    results.map((card) => (
                        <button
                            key={card.id}
                            type="button"
                            onClick={() => router.push(`/dashboard/cards?q=${encodeURIComponent(card.name)}`)}
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
        </div>
    );
}
