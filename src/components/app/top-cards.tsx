import Link from "next/link";
import { CardImage } from "@/components/app/card-image";
import { getMyCards } from "@/lib/cards";
import { formatPrice } from "@/lib/format";

// Home's most valuable cards: the five dearest copies you hold, as a row of small tiles, each
// its picture, name and price. The heading leads to the whole list sorted the same way. Read
// under Suspense so the page does not wait for it.
export async function TopCards() {
    const { cards } = await getMyCards({ sort: "price", order: "desc", limit: 5, facets: false });
    const top = cards.filter((c) => c.price != null);
    if (top.length === 0) return null;
    return (
        <section
            aria-labelledby="top-cards-heading"
            className="flex flex-col gap-4 rounded-xl bg-primary px-4 py-5 shadow-lift-xs ring-1 ring-primary ring-inset md:px-5"
        >
            <div className="flex items-baseline justify-between gap-4">
                <h2 id="top-cards-heading" className="text-md font-semibold text-primary">
                    Most valuable cards
                </h2>
                <Link href="/dashboard/cards?sort=price-desc" className="text-sm font-semibold text-brand-secondary outline-focus-ring focus-visible:outline-2">
                    See all
                </Link>
            </div>
            <ol className="grid grid-cols-5 gap-3">
                {top.map((card) => (
                    <li key={card.id} className="flex min-w-0 flex-col gap-1.5">
                        <div className="relative aspect-card w-full overflow-hidden rounded-card bg-quaternary">
                            {card.image_url ? <CardImage src={card.image_high_url ?? card.image_url} alt="" width={160} className="object-cover" /> : null}
                        </div>
                        <span className="truncate text-xs font-medium text-primary">{card.name}</span>
                        <span className="text-xs text-tertiary tabular-nums">{formatPrice(card.price)}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
