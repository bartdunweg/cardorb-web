import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BrowseToolbar, SetsViewMenu } from "@/components/app/browse-toolbar";
import { PageHeader } from "@/components/app/page-header";
import { SetsShelf } from "@/components/app/sets-shelf";
import { SetsOutline } from "@/components/app/skeletons";
import { type BrowseQuery, type BrowseSearchParams, progressShelf, readBrowseQuery, searchShelf, sortShelf } from "@/lib/browse-query";
import { openAsLeft } from "@/lib/list-memory-server";
import { CatalogueUnavailable, getSets } from "@/lib/sets";
import { SETS_VIEW_COOKIE, type SetsViewMode, parseSetsView } from "@/lib/sets-view";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Browse" };

export default async function SetsPage({ searchParams }: { searchParams: Promise<BrowseSearchParams> }) {
    // Which catalogue and in what order, from the URL; tiles or rows, from the cookie the View menu writes.
    const params = await searchParams;
    // A bare address opens the shelf as it was left (list-memory-server.ts).
    await openAsLeft("/dashboard/sets", params);
    const query = readBrowseQuery(params);
    const view = parseSetsView((await cookies()).get(SETS_VIEW_COOKIE)?.value);
    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* The title alone: how far the shelf is comes per set, on its tile, not as one number over all of them. */}
            {/* On a phone the search field stands in the title's place: the tab bar already says Browse (`RowSearch` place "bar"). */}
            <PageHeader title="Browse" searchField barActions={<SetsViewMenu initialView={view} className="sm:hidden" />} />
            {/* The shelf is not awaited: the title and the row go out first, the sets when the catalogue answers. */}
            <BrowseToolbar query={query} view={view} />
            {/* Keyed by what reads another shelf, not by the search: a new term keeps the sets on screen
                until the narrower list is in, where a key with it put the skeleton up on every pause. */}
            <Suspense key={`${query.language}:${query.sort}:${query.progress}`} fallback={<SetsOutline />}>
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
    // The name first, on its own: an empty shelf the progress filter made is not a name nobody has.
    const named = searchShelf(shelf.series, query.q);
    const series = sortShelf(progressShelf(named, query.progress), query.sort);
    if (named.length === 0 && query.q) {
        return <AppEmptyState icon="search" title="No sets found" description={`No set is called “${query.q}”. Try another name.`} />;
    }
    if (series.length === 0 && query.progress !== "all") {
        const why = {
            started: "No set in this language is half done.",
            complete: "No set in this language is complete yet.",
            new: "You have cards from every set in this language.",
        }[query.progress];
        return <AppEmptyState icon="book" title="No sets found" description={`${why} Choose All sets to see the whole shelf.`} />;
    }

    // The sets as data, not as 204 tiles' worth of markup: the shelf draws a few screens and the
    // rest as you scroll (sets-shelf.tsx).
    return <SetsShelf series={series} language={query.language} view={view} />;
}
