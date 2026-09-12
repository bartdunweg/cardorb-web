"use client";

import { useEffect, useRef, useState } from "react";
import { SetRow } from "@/components/app/set-row";
import { FIRST_ROW, SETS_COLUMNS, SetTile } from "@/components/app/set-tile";
import { Button } from "@/components/base/buttons/button";
import type { SetSeries } from "@/lib/api-shapes";
import type { BrowseLanguage } from "@/lib/languages";
import type { SetsViewMode } from "@/lib/sets-view";

/**
 * Ours: the Browse shelf, drawn a few screens at a time.
 *
 * The English shelf is 204 sets, and every one of them was drawn on the server: a tile's worth of
 * markup, 1.6 KB of it, 204 times, in the answer to every tab switch, and then the phone parsed
 * and laid out all 204 before the first one was on screen. The shelf's own data is a fraction of
 * that, so the sets come over as data now and the tiles are drawn here, a batch at a time, a
 * screen ahead of the sentinel. The same shape the Pokédex's thousand slots already had
 * (dex-grid.tsx); the sets were the page that still drew everything at once.
 *
 * Searching and sorting stay on the server, where the query string is read: this draws what it is
 * handed, in the order it is handed.
 */

/** Sets drawn per batch: six rows at the widest grid, twelve on a phone, the rest as you scroll. */
const SHELF_BATCH = 36;

export function SetsShelf({ series, language, view }: { series: SetSeries[]; language: BrowseLanguage; view: SetsViewMode }) {
    const [shown, setShown] = useState(SHELF_BATCH);
    // Where each series starts in the count over the whole shelf, and the whole: a series the
    // batch has not reached is not drawn, heading included.
    const starts = series.map((_, i) => series.slice(0, i).reduce((n, group) => n + group.sets.length, 0));
    const total = (starts[series.length - 1] ?? 0) + (series[series.length - 1]?.sets.length ?? 0);
    const more = shown < total;
    const sentinel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = sentinel.current;
        if (!el || !more || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry?.isIntersecting) return;
                observer.disconnect();
                setShown((n) => n + SHELF_BATCH);
            },
            { rootMargin: "100% 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [more, shown]);

    return (
        <>
            {series.map((group, g) => {
                const start = starts[g]!;
                if (start >= shown) return null;
                // Sorted by name the shelf is one group with no name: a section still, but no heading.
                const id = group.name ? `series-${slug(group.name)}` : undefined;
                return (
                    <section key={group.name || "all"} aria-labelledby={id} aria-label={id ? undefined : "Sets"} className="flex flex-col gap-3">
                        {group.name ? (
                            <h2 id={id} className="text-lg font-semibold text-primary">
                                {group.name}
                            </h2>
                        ) : null}
                        <ul className={view === "grid" ? `grid gap-4 ${SETS_COLUMNS}` : "flex flex-col gap-2"}>
                            {/* The first row of each series arrives 30 ms apart; the rest of it together. */}
                            {group.sets.slice(0, shown - start).map((set, i) => (
                                <li key={set.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i, 5) * 30}ms` } as React.CSSProperties}>
                                    {view === "grid" ? (
                                        // Only the first series' first row is on screen at load; every tile under it loads as it scrolls in.
                                        <SetTile set={set} language={language} priority={g === 0 && i < FIRST_ROW} />
                                    ) : (
                                        <SetRow set={set} language={language} />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}
            {more ? (
                <div ref={sentinel} className="flex justify-center py-2">
                    {/* The way on when the sentinel is never seen: a keyboard, or an observer the
                        browser does not have. The kit's quietest button, as the Pokédex has it. */}
                    <Button color="link-gray" size="sm" onClick={() => setShown((n) => n + SHELF_BATCH)}>
                        Show more
                    </Button>
                </div>
            ) : null}
        </>
    );
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
