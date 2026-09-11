"use client";

import { ClockRewind } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";

// What a search box offers before a letter is typed: the last few terms, each a press away, and
// a way to be rid of them. Ours — the kit has a command menu with recent items but no plain list
// for a dialog. The terms come from `useRecentSearches`; this only draws them.
export function RecentSearches({ terms, onPick, onClear }: { terms: readonly string[]; onPick: (term: string) => void; onClear: () => void }) {
    if (!terms.length) return null;
    return (
        <section aria-labelledby="recent-searches-title" className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-2">
                <h3 id="recent-searches-title" className="text-xs font-medium text-tertiary">
                    Recent searches
                </h3>
                <Button size="sm" color="link-gray" onClick={onClear}>
                    Clear
                </Button>
            </div>
            <ul className="flex flex-col">
                {terms.map((term) => (
                    <li key={term} className="flex">
                        <Button size="sm" color="tertiary" iconLeading={ClockRewind} className="w-full justify-start" onClick={() => onPick(term)}>
                            {term}
                        </Button>
                    </li>
                ))}
            </ul>
        </section>
    );
}
