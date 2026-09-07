import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardImage } from "@/components/app/card-image";
import { PageHeader } from "@/components/app/page-header";
import { SetCards } from "@/components/app/set-cards";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { isBrowseLanguage } from "@/lib/languages";
import { CatalogueUnavailable, getSet } from "@/lib/sets";

const n = (value: number) => value.toLocaleString("en-US");

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
    const subtitle = [set.localName, set.series, released ? `released ${released}` : null, `${n(set.owned)} of ${n(set.total)} cards`]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="flex flex-col gap-6">
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

            <SetCards cards={set.cards} readOnly={language !== "en"} />
        </div>
    );
}
