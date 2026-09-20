import Link from "next/link";
import { TopCardsRow } from "@/components/app/top-cards-row";
import { type Card, getMyCards } from "@/lib/cards";
import { type HomeList, listFilter } from "@/lib/home-list";
import { sideRead } from "@/lib/side-read";
import { TILE_SURFACE } from "@/lib/tile";
import { perUser } from "@/lib/user-cache";

// Home's most valuable cards: the twelve dearest copies you hold, as a row that scrolls sideways,
// each tile its picture, name and price, opening the card's sheet. The heading leads to the whole list sorted the same way. Read
// under Suspense so the page does not wait for it.
//
// `top` is the read, started by the page before it waits on the stats (readTopCards).
export async function TopCards({
    top: read,
    href = "/dashboard/cards",
    sortable = true,
}: {
    top: Promise<Card[]>;
    href?: string;
    /** False for a binder shown as a Pokédex: its page draws dex order, so a price sort there cannot be seen. */
    sortable?: boolean | Promise<boolean>;
}) {
    const [top, sorts] = await Promise.all([read, sortable]);
    if (top.length === 0) return null;
    return (
        <section aria-labelledby="top-cards-heading" className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
                <h2 id="top-cards-heading" className="text-md font-semibold text-primary">
                    Most valuable cards
                </h2>
                {sorts ? (
                    <Link
                        href={`${href}?sort=price-desc`}
                        className="hit-area relative text-sm font-semibold text-brand-secondary outline-focus-ring focus-visible:outline-2"
                    >
                        See all
                    </Link>
                ) : null}
            </div>
            {/* In a tile like the movers above it: the row scrolls inside it. */}
            <div className={`${TILE_SURFACE} p-4 sm:p-5`}>
                <TopCardsRow cards={top} />
            </div>
        </section>
    );
}

/** The dearest cards, never rejecting: a failed read hides the row, as an empty one does, rather than taking Home down with it. */
export const readTopCards = (list: HomeList = "all"): Promise<Card[]> => sideRead("top cards", () => topCards(list), []);

// Kept per person like the list's first batch: twelve is not a batch size, so this read went to the
// API on every open of Home. Five minutes in the person's holdings scope, dropped by a card write and
// not by a star; the window in the key also carries the night's new prices in by the next morning's first open.
// Per list: Home's list choice picks whose dearest cards these are. The collection's go with what it
// holds (`holdings`); a list's go with its first batch (`lists`), which a binder edit also forgets.
function topCards(list: HomeList) {
    return perUser(list === "all" ? "holdings" : "lists", `top-cards:v2:${list}`, async (token) => {
        const { cards } = await getMyCards({ ...listFilter(list), sort: "price", order: "desc", limit: 12, facets: false, token });
        return cards.filter((c) => c.price != null);
    });
}
