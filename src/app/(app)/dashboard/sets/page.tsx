import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BrowseLanguage } from "@/components/app/browse-language";
import { CardImage } from "@/components/app/card-image";
import { MobileTopRow } from "@/components/app/mobile-top-row";
import { PageHeader } from "@/components/app/page-header";
import { SetsOutline } from "@/components/app/skeletons";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { type BrowseLanguage as BrowseLanguageCode, isBrowseLanguage } from "@/lib/languages";
import { CatalogueUnavailable, type SetSummary, getSets } from "@/lib/sets";
import { cx } from "@/utils/cx";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Browse" };

const n = (value: number) => value.toLocaleString("en-US");

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
            {series.map((group) => (
                <section key={group.name} aria-labelledby={`series-${slug(group.name)}`} className="flex flex-col gap-3">
                    <h2 id={`series-${slug(group.name)}`} className="text-lg font-semibold text-primary">
                        {group.name}
                    </h2>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {/* The first row of each series arrives 30 ms apart; the rest of it together. */}
                        {group.sets.map((set, i) => (
                            <li key={set.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i, 3) * 30}ms` } as React.CSSProperties}>
                                <SetTile set={set} language={language} />
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </>
    );
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// One set on the shelf. The whole tile is the link; the bar repeats the count, which is the
// accessible name, so a screen reader hears "12 of 207" once. A set with nothing in it stays on
// the shelf but dimmed, like an empty Pokédex slot: it is the part still to collect.
function SetTile({ set, language }: { set: SetSummary; language: BrowseLanguageCode }) {
    const empty = set.owned === 0;
    return (
        <Link
            href={`/dashboard/sets/${encodeURIComponent(set.id)}${language === "en" ? "" : `?language=${language}`}`}
            className={cx(
                "flex pressable items-center gap-4 rounded-xl bg-primary p-4 shadow-lift-xs ring-1 ring-primary outline-focus-ring transition-[color,background-color,box-shadow] ring-inset hover:bg-secondary focus-visible:outline-2",
                empty && "opacity-70 hover:opacity-100",
            )}
        >
            <div className="relative flex size-12 shrink-0 items-center justify-center">
                {set.logoUrl ? (
                    // The logo is decoration: the name beside it says which set this is.
                    // The width is the box's own (size-12 = 48), not double it: the optimizer already
                    // asks for 2x on top, and 96 here fetched the 192 px file for a 48 px logo —
                    // sixteen times the pixels, on 157 tiles.
                    <CardImage src={set.logoUrl} alt="" width={48} ratio="square" className="object-contain" />
                ) : (
                    <div className="size-full rounded-md bg-secondary" />
                )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-primary">{set.name}</span>
                        {set.localName ? <span className="truncate text-xs text-tertiary">{set.localName}</span> : null}
                    </span>
                    <span className="shrink-0 text-sm text-tertiary tabular-nums">
                        {n(set.owned)} of {n(set.total)}
                    </span>
                </div>
                <ProgressBarBase value={set.owned} max={set.total || 1} aria-label={`${set.name}: ${n(set.owned)} of ${n(set.total)} cards`} />
            </div>
        </Link>
    );
}
