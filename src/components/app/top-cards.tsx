import Link from "next/link";
import { TopCardsRow } from "@/components/app/top-cards-row";
import { getMyCards } from "@/lib/cards";
import { TILE_SURFACE } from "@/lib/tile";

// Home's most valuable cards: the twelve dearest copies you hold, as a row that scrolls sideways,
// each tile its picture, name and price, opening the card's sheet. The heading leads to the whole list sorted the same way. Read
// under Suspense so the page does not wait for it.
export async function TopCards() {
    const { cards } = await getMyCards({ sort: "price", order: "desc", limit: 12, facets: false });
    const top = cards.filter((c) => c.price != null);
    if (top.length === 0) return null;
    return (
        <section aria-labelledby="top-cards-heading" className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
                <h2 id="top-cards-heading" className="text-md font-semibold text-primary">
                    Most valuable cards
                </h2>
                <Link href="/dashboard/cards?sort=price-desc" className="text-sm font-semibold text-brand-secondary outline-focus-ring focus-visible:outline-2">
                    See all
                </Link>
            </div>
            {/* In a tile like the movers above it: the row scrolls inside it. */}
            <div className={`${TILE_SURFACE} p-4 sm:p-5`}>
                <TopCardsRow cards={top} />
            </div>
        </section>
    );
}
