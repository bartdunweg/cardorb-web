import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardImage } from "@/components/app/card-image";
import { PageHeader } from "@/components/app/page-header";
import { SetCardTile } from "@/components/app/set-card-tile";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { CatalogueUnavailable, getSet } from "@/lib/sets";

const n = (value: number) => value.toLocaleString("en-US");

/** "2024/01/26" as the catalogue writes it, read out as "26 January 2024". */
function releaseLabel(date: string | null): string | null {
    if (!date) return null;
    const [y, m, d] = date.split("/").map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let set;
    try {
        set = await getSet(id);
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
    const subtitle = [set.series, released ? `released ${released}` : null, `${n(set.owned)} of ${n(set.total)} cards`].filter(Boolean).join(" · ");

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title={set.name}
                subtitle={subtitle}
                back={{ href: "/dashboard/sets", label: "Browse" }}
                // The set's logo over its name, as it is printed on the pack. Decoration: the h1 says which set.
                above={
                    set.logoUrl ? (
                        <div className="relative h-14 w-48 max-w-full">
                            <CardImage src={set.logoUrl} alt="" sizes="192px" className="object-contain object-left" />
                        </div>
                    ) : undefined
                }
            >
                <ProgressBarBase value={set.owned} max={set.total || 1} className="mt-2 max-w-md" aria-label={`${set.name} completion`} />
            </PageHeader>

            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {/* The first two rows arrive 20 ms apart, the rest together; the same wave as a folder's cards. */}
                {set.cards.map((card, i) => (
                    <li key={card.id} className="arrive" style={{ "--arrive-delay": `${Math.min(i, 16) * 20}ms` } as React.CSSProperties}>
                        <SetCardTile card={card} />
                    </li>
                ))}
            </ul>
        </div>
    );
}
