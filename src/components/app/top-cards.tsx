import Link from "next/link";
import { TopCardsRow } from "@/components/app/top-cards-row";
import { getMyCards } from "@/lib/cards";
import { sideRead } from "@/lib/side-read";
import { TILE_SURFACE } from "@/lib/tile";
import { perUser } from "@/lib/user-cache";

// Home's most valuable cards: the twelve dearest copies you hold, as a row that scrolls sideways,
// each tile its picture, name and price, opening the card's sheet. The heading leads to the whole list sorted the same way. Read
// under Suspense so the page does not wait for it.
export async function TopCards() {
    // A failed read hides the row, as an empty one does, rather than taking Home down with it.
    const top = await sideRead("top cards", topCards, []);
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

// Kept per person like the list's first batch: twelve is not a batch size, so this read went to the
// API on every open of Home. Five minutes in the person's stats scope, dropped by a card write; the window in
// the key also carries the night's new prices in by the next morning's first open.
function topCards() {
    return perUser("stats", "top-cards:v1", async (token) => {
        const { cards } = await getMyCards({ sort: "price", order: "desc", limit: 12, facets: false, token });
        return cards.filter((c) => c.price != null);
    });
}
