"use server";

import type { FilterCounts } from "@/lib/api-shapes";
import { type Card, LIST_BATCH, getMyCards } from "@/lib/cards";
import { loadMoreInput, warmListInput } from "@/lib/list-filter";

// The next batch of a list, asked for by `CardsList` when the reader scrolls near its end. The
// same read the page made for the first batch, with the same filter and a further offset; the
// API says who is asking from the session, so a stranger's call answers 401 and the list stops.
//
// The shape lives in `@/lib/list-filter` because a "use server" file may export nothing but
// async functions, and a schema nobody can import is a schema nobody can test.
//
// The count comes back with the batch. The first page's count can be minutes old (it is cached,
// and the API folds and refiles rows on its own), and a list that went by it believed it was
// still owed cards: it asked for the same empty batch again and again, with the skeleton standing
// under the last card. The count as of this batch is the one the list stops on.

export async function loadMoreCards(input: unknown): Promise<{ cards: Card[]; total: number }> {
    const parsed = loadMoreInput.safeParse(input);
    if (!parsed.success) return { cards: [], total: 0 };
    const { offset, ...filter } = parsed.data;
    // A batch on scroll reads the cards alone; the facets came with the first page.
    const { cards, total } = await getMyCards({ ...filter, facets: false, limit: LIST_BATCH, offset });
    return { cards, total };
}

/**
 * The first batch of a list, read before anybody asks for it.
 *
 * The measuring said the list at the API is the whole of a tab switch: the session check is
 * under a millisecond, the profile and the binders are cache hits, a page's shell is 20 to 70 ms,
 * and `GET /cards` is 250 to 450 ms. Nothing in this app makes that read faster (a smaller first
 * batch and skipping the facets pass both measured the same), so it happens before the tap
 * instead: while you read the page you are on, the three lists the navigation leads to are read
 * and land in the same five-minute cache the pages read from, and the tap is a cache hit.
 *
 * A bare visit's filter, which is no filter at all: that is the entry a tapped tab reads. A
 * narrowed list (a search, a set) is its own entry and is not warmed; it is not what a tab does.
 * The Pokédex is not here for the reason it is not in the sidebar's prefetch either: it reads
 * every card you own, and paying for that on the chance of a tap is the page you are on waiting.
 *
 * Costs nothing on a hit, which is the common case; after a write, when the cache was dropped,
 * it costs one read per list per five minutes.
 */
export async function warmList(input: unknown): Promise<void> {
    const parsed = warmListInput.safeParse(input);
    if (!parsed.success) return;
    const filter = parsed.data.list === "wishlist" ? { wishlist: true } : parsed.data.list === "favorites" ? { favoritesOnly: true } : {};
    try {
        await getMyCards({ ...filter, limit: LIST_BATCH });
    } catch {
        // A warm that fails is a tap that pays for its own read, which is what it did before.
    }
}

/**
 * How many cards a filter finds, for the Filters sheet's button while the choices are still a
 * draft ("Show 42 cards"). One card asked for, no facets: the count is the whole answer wanted.
 * Null when it cannot say, and the button falls back to "Show results".
 */
export async function countCards(input: unknown): Promise<{ total: number; counts: FilterCounts | null } | null> {
    const parsed = loadMoreInput.omit({ offset: true }).safeParse(input);
    if (!parsed.success) return null;
    try {
        // The cards the list will show, as a narrowed page counts them under its title ("25 matches"),
        // and beside each choice in the sheet what choosing it would leave.
        const { total, counts } = await getMyCards({ ...parsed.data, facets: false, counts: true, limit: 1 });
        return { total, counts };
    } catch {
        return null;
    }
}
