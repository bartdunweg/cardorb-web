import Link from "next/link";
import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardImage } from "@/components/app/card-image";
import { PageHeader } from "@/components/app/page-header";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { CatalogueUnavailable, type SetCard, getSet } from "@/lib/sets";
import { cx } from "@/utils/cx";

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
            <PageHeader title={set.name} subtitle={subtitle} back={{ href: "/dashboard/sets", label: "Sets" }}>
                <ProgressBarBase value={set.owned} max={set.total || 1} className="mt-2 max-w-md" aria-label={`${set.name} completion`} />
            </PageHeader>

            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                {set.cards.map((card) => (
                    <li key={card.id}>
                        <SetCardTile card={card} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

const SIZES = "(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, (max-width: 1280px) 17vw, 140px";

// A card you hold opens Cards on that card, as the Pokédex does. One you do not is drawn grey and
// is not a link: there is nothing of yours to open. The number and name under the picture carry
// the meaning, so the dimming is not the only signal.
function SetCardTile({ card }: { card: SetCard }) {
    const picture = card.imageUrl ? (
        <CardImage src={card.imageUrl} alt="" sizes={SIZES} className={cx("object-cover", !card.owned && "opacity-30 grayscale")} />
    ) : (
        <div className="flex size-full items-center justify-center bg-quaternary p-1 text-center text-xxs text-quaternary">{card.name}</div>
    );

    const caption = (
        <span className="flex items-baseline gap-1 text-xs">
            <span className="shrink-0 text-tertiary tabular-nums">#{card.number}</span>
            <span className={cx("truncate", card.owned ? "text-primary" : "text-quaternary")}>{card.name}</span>
            {card.quantity > 1 ? <span className="ml-auto shrink-0 text-tertiary tabular-nums">×{card.quantity}</span> : null}
        </span>
    );

    const frame = cx("relative aspect-[63/88] overflow-hidden rounded-md ring-1 ring-secondary ring-inset", !card.owned && "bg-secondary");

    if (!card.owned) {
        return (
            <div className="flex flex-col gap-1.5">
                <div className={frame}>{picture}</div>
                {caption}
                <span className="sr-only">Not in your collection</span>
            </div>
        );
    }

    return (
        <Link
            href={`/dashboard/cards?q=${encodeURIComponent(card.name)}`}
            aria-label={`${card.name} #${card.number}${card.quantity > 1 ? `, ${card.quantity} copies` : ""}`}
            className="group flex flex-col gap-1.5 rounded-md outline-focus-ring focus-visible:outline-2"
        >
            <div className={frame}>{picture}</div>
            {caption}
        </Link>
    );
}
