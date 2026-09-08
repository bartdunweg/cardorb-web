"use server";

import { type Card, LIST_BATCH, getMyCards } from "@/lib/cards";
import { loadMoreInput } from "@/lib/list-filter";

// The next batch of a list, asked for by `CardsList` when the reader scrolls near its end. The
// same read the page made for the first batch, with the same filter and a further offset; the
// API says who is asking from the session, so a stranger's call answers 401 and the list stops.
//
// The shape lives in `@/lib/list-filter` because a "use server" file may export nothing but
// async functions, and a schema nobody can import is a schema nobody can test.

export async function loadMoreCards(input: unknown): Promise<Card[]> {
    const parsed = loadMoreInput.safeParse(input);
    if (!parsed.success) return [];
    const { offset, ...filter } = parsed.data;
    // A batch on scroll reads the cards alone; the facets came with the first page.
    return (await getMyCards({ ...filter, facets: false, limit: LIST_BATCH, offset })).cards;
}
