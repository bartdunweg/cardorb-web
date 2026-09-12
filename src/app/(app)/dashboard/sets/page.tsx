import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BrowseToolbar } from "@/components/app/browse-toolbar";
import { PageHeader } from "@/components/app/page-header";
import { SetRow } from "@/components/app/set-row";
import { FIRST_ROW, SETS_COLUMNS, SetTile } from "@/components/app/set-tile";
import { SetsOutline } from "@/components/app/skeletons";
import { type BrowseQuery, type BrowseSearchParams, readBrowseQuery, searchShelf, sortShelf } from "@/lib/browse-query";
import { CatalogueUnavailable, getSets } from "@/lib/sets";
import { SETS_VIEW_COOKIE, type SetsViewMode, parseSetsView } from "@/lib/sets-view";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Browse" };

export default async function SetsPage({ searchParams }: { searchParams: Promise<BrowseSearchParams> }) {
    // Which catalogue and in what order, from the URL; tiles or rows, from the cookie the View menu writes.
    const query = readBrowseQuery(await searchParams);
    const view = parseSetsView((await cookies()).get(SETS_VIEW_COOKIE)?.value);
    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* The title alone: how far the shelf is comes per set, on its tile, not as one number over all of them. */}
            <PageHeader title="Browse" />
            {/* The shelf is not awaited: the title and the row go out first, the sets when the catalogue answers. */}
            <BrowseToolbar query={query} view={view} />
            <Suspense key={`${query.language}:${query.sort}:${query.q ?? ""}:${view}`} fallback={<SetsOutline />}>
                <Shelf query={query} view={view} />
            </Suspense>
        </div>
    );
}

async function Shelf({ query, view }: { query: BrowseQuery; view: SetsViewMode }) {
    let shelf;
    try {
        shelf = await getSets(query.language);
    } catch (err) {
        if (!(err instanceof CatalogueUnavailable)) throw err;
        return (
            <AppEmptyState
                icon="book"
                title="The catalogue is not answering"
                description="The list of sets comes from the card catalogue, which is not reachable right now. Try again in a minute."
            />
        );
    }
    const series = sortShelf(searchShelf(shelf.series, query.q), query.sort);
    if (series.length === 0 && query.q) {
        return <AppEmptyState icon="search" title="No sets found" description={`No set is called “${query.q}”. Try another name.`} />;
    }

    return (
        <>
            {series.map((group, g) => {
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
                            {group.sets.map((set, i) => (
                                <li key={set.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i, 5) * 30}ms` } as React.CSSProperties}>
                                    {view === "grid" ? (
                                        // Only the first series' first row is on screen at load; every tile under it loads as it scrolls in.
                                        <SetTile set={set} language={query.language} priority={g === 0 && i < FIRST_ROW} />
                                    ) : (
                                        <SetRow set={set} language={query.language} />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}
        </>
    );
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
