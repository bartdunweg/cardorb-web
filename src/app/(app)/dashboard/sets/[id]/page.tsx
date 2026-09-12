import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardImage } from "@/components/app/card-image";
import { PageHeader } from "@/components/app/page-header";
import { SetCards } from "@/components/app/set-cards";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { formatCount } from "@/lib/format";
import { isBrowseLanguage } from "@/lib/languages";
import { CatalogueUnavailable, getSet, getSets } from "@/lib/sets";

// The set's own name in the tab, so a history of open sets is readable.
//
// The shelf, not getSet: the shelf is one cached read per person (five minutes), while getSet pages
// through every card in the set — up to ten requests, and it is not deduplicated, so asking it here
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
        const { series } = await getSets(language);
        const set = series.flatMap((group) => group.sets).find((s) => s.id === id);
        if (set) return { title: set.name };
    } catch {
        // Fall through to the plain title.
    }
    return { title: "Set" };
}

/** "2024/01/26" as the catalogue writes it, read out as "26 January 2024". */
function releaseLabel(date: string | null): string | null {
    if (!date) return null;
    const [y, m, d] = date.split("/").map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function SetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ language?: string }> }) {
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

    const released = releaseLabel(set.releaseDate);
    // The set's own name first where the title is a translation: that is what the pack says.
    const subtitle = [set.localName, set.series, released ? `released ${released}` : null, `${formatCount(set.owned)} of ${formatCount(set.total)} cards`]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title={set.name}
                subtitle={subtitle}
                back={{ href: language === "en" ? "/dashboard/sets" : `/dashboard/sets?language=${language}`, label: "Browse" }}
                // The set's logo over its name, as it is printed on the pack. Decoration: the h1 says which set.
                above={
                    set.logoUrl ? (
                        <div className="relative h-14 w-48 max-w-full">
                            <CardImage src={set.logoUrl} alt="" width={192} ratio="square" className="object-contain object-left" />
                        </div>
                    ) : undefined
                }
            >
                <ProgressBarBase value={set.owned} max={set.total || 1} className="mt-2 max-w-md" aria-label={`${set.name} completion`} />
            </PageHeader>

            {set.cards.length === 0 ? (
                /* TCGdex lists a set and its count long before it records the cards: 68 of the 184
                   Japanese sets and 92 of the 95 Korean ones stood like that on 2026-09-11. The page
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
                <SetCards cards={set.cards} language={language} />
            )}
        </div>
    );
}
