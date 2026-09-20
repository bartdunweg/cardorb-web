import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BarSearchButton } from "@/components/app/bar-search-button";
import { BarViewMenu } from "@/components/app/bar-view-menu";
import { PageHeader } from "@/components/app/page-header";
import { SetCards } from "@/components/app/set-cards";
import { SetHero } from "@/components/app/set-hero";
import { LiveSetStats, SetLive } from "@/components/app/set-live";
import { SetSkeleton } from "@/components/app/skeletons";
import { formatCount, formatDate } from "@/lib/format";
import { isBrowseLanguage } from "@/lib/languages";
import { rememberedView } from "@/lib/list-memory-server";
import { logoPalette } from "@/lib/logo-color";
import { holdingStamp } from "@/lib/set-holding";
import { setStats } from "@/lib/set-stats";
import { CatalogueUnavailable, getSet, getShelf } from "@/lib/sets";

// The set's own name in the tab, so a history of open sets is readable.
//
// The shelf, not getSet: the shelf is one cached read per person (five minutes), while getSet pages
// through every card in the set, up to ten requests, and it is not deduplicated, so asking it here
// would read the whole set twice to write a title. A catalogue that will not answer is the page's
// story to tell, not the tab's, so it falls back to the plain word.
export async function generateMetadata({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ language?: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const { language: raw } = await searchParams;
    const language = isBrowseLanguage(raw) ? raw : "en";
    try {
        const { series } = await getShelf(language);
        const set = series.flatMap((group) => group.sets).find((s) => s.id === id);
        if (set) return { title: set.name };
    } catch {
        // Fall through to the plain title.
    }
    return { title: "Set" };
}

/** "2024/01/26" as the catalogue writes it, read out as "Jan 26, 2024", the way Browse writes it. */
function releaseLabel(date: string | null): string | null {
    if (!date || !/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(date)) return null;
    return formatDate(date);
}

export default function SetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ language?: string }> }) {
    // The name, the wash and the cards all come from the catalogue, so there is nothing to draw
    // before it answers; the outline stands inside the page rather than in place of the last one.
    return (
        <Suspense fallback={<SetSkeleton />}>
            <Set params={params} searchParams={searchParams} />
        </Suspense>
    );
}

async function Set({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ language?: string }> }) {
    const { id } = await params;
    const { language: raw } = await searchParams;
    const language = isBrowseLanguage(raw) ? raw : "en";
    let set;
    try {
        set = await getSet(id, language);
    } catch (err) {
        if (!(err instanceof CatalogueUnavailable)) throw err;
        return (
            <AppEmptyState
                icon="book"
                title="The catalogue is not answering"
                description="This set comes from the card catalogue, which is not reachable right now. Try again in a minute."
            />
        );
    }
    if (!set) notFound();

    // Read once per logo and cached a month; a logo they cannot be read from gives the wash its grey.
    const colors = await logoPalette(set.logoUrl);
    const released = releaseLabel(set.releaseDate);
    // The counts over the set's own total rather than the cards read, which is the same number on
    // every set the catalogue has recorded and the catalogue's own count on one it has not.
    const stats = { ...setStats(set.cards, set.total), owned: set.owned };
    // What you hold of the set, as this render read it: a new one drops what the tiles held since (SetLive).
    const stamp = holdingStamp(set.cards);
    /* The size as the set pages were left: one memory for all of them (list-memory.ts). */
    const remembered = await rememberedView(`/dashboard/sets/${id}`);

    return (
        <SetLive stamp={stamp}>
            <div className="flex flex-1 flex-col gap-6">
                <PageHeader
                    title={set.name}
                    // The era over the name, except where the set is the era's first and shares its name.
                    eyebrow={set.series !== set.name ? set.series : undefined}
                    // The set's own name where the title is a translation: that is what the pack says.
                    subtitle={set.localName ?? undefined}
                    backOnDesktop
                    back={{ href: language === "en" ? "/dashboard/sets" : `/dashboard/sets?language=${language}`, label: "Browse" }}
                    // The set's logo on its own colour, edge to edge over the name. Decoration: the h1 says
                    // which set. No progress bar under the title: the owner's call is that the page
                    // shows the cards, not a meter, so the numbers under the title say the count in words.
                    hero={<SetHero name={set.name} logoUrl={set.logoUrl} colors={colors} />}
                    // On a phone View sits in the bar across from Back; the row under the search is the filters.
                    barActions={
                        set.cards.length > 0 ? (
                            <>
                                <BarSearchButton label={`Search in ${set.name}`} />
                                <BarViewMenu initialView="grid" initialSize={remembered.size} initialGroup={remembered.group} layouts={false} />
                            </>
                        ) : undefined
                    }
                >
                    {set.cards.length > 0 ? <LiveSetStats stats={stats} released={released} gallery={set.gallery} /> : null}
                </PageHeader>

                {set.cards.length === 0 ? (
                    /* TCGdex lists a set and its count long before it records the cards: 68 of the 184
                   Japanese sets stood like that on 2026-09-11. The page
                   opened on nothing, under a header that said "0 of 60 cards" and looked like a
                   collection with a long way to go. It is the catalogue that has the way to go. */
                    <AppEmptyState
                        icon="book"
                        title="No cards in the catalogue yet"
                        description={
                            set.total > 0
                                ? `The card catalogue lists this set with ${formatCount(set.total)} cards but has not recorded them. They will show here when it has.`
                                : "The card catalogue has this set on record but none of its cards. They will show here when it has them."
                        }
                    />
                ) : (
                    /* The address's own id, not `set.id`: that is what `getSet` keyed this page's
                       cache entry on, and the API answers an old or differently cased id with the
                       canonical set. Handing the tiles the canonical one made a press forget a tag
                       no entry carried, and the page kept its marks for the rest of its five minutes. */
                    <SetCards cards={set.cards} setId={set.id} language={language} initialSize={remembered.size} />
                )}
            </div>
        </SetLive>
    );
}
