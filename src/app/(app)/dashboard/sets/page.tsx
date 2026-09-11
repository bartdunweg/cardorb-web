import { Suspense } from "react";
import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BrowseLanguage } from "@/components/app/browse-language";
import { MobileTopRow } from "@/components/app/mobile-top-row";
import { PageHeader } from "@/components/app/page-header";
import { FIRST_ROW, SETS_COLUMNS, SetTile } from "@/components/app/set-tile";
import { SetsOutline } from "@/components/app/skeletons";
import { type BrowseLanguage as BrowseLanguageCode, isBrowseLanguage } from "@/lib/languages";
import { CatalogueUnavailable, getSets } from "@/lib/sets";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Browse" };

export default async function SetsPage({ searchParams }: { searchParams: Promise<{ language?: string }> }) {
    const { language: raw } = await searchParams;
    const language: BrowseLanguageCode = isBrowseLanguage(raw) ? raw : "en";
    return (
        <div className="flex flex-col gap-6">
            {/* The title alone: how far the shelf is comes per set, on its tile, not as one number over all of them. */}
            <PageHeader title="Browse" above={<MobileTopRow />} titleOnPhone={false} />
            {/* The shelf is not awaited: the title and the search go out first, the sets when the catalogue answers. */}
            {/* Which catalogue: English, or one of TCGdex's own for Japanese, Chinese and Korean cards. */}
            <BrowseLanguage value={language} />
            <Suspense key={language} fallback={<SetsOutline />}>
                <Shelf language={language} />
            </Suspense>
        </div>
    );
}

async function Shelf({ language }: { language: BrowseLanguageCode }) {
    let shelf;
    try {
        shelf = await getSets(language);
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
    const { series } = shelf;

    return (
        <>
            {series.map((group, g) => (
                <section key={group.name} aria-labelledby={`series-${slug(group.name)}`} className="flex flex-col gap-3">
                    <h2 id={`series-${slug(group.name)}`} className="text-lg font-semibold text-primary">
                        {group.name}
                    </h2>
                    <ul className={`grid gap-4 ${SETS_COLUMNS}`}>
                        {/* The first row of each series arrives 30 ms apart; the rest of it together. */}
                        {group.sets.map((set, i) => (
                            <li key={set.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i, 5) * 30}ms` } as React.CSSProperties}>
                                {/* Only the first series' first row is on screen at load; every tile under it loads as it scrolls in. */}
                                <SetTile set={set} language={language} priority={g === 0 && i < FIRST_ROW} />
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </>
    );
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
