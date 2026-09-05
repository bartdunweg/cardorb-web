"use server";

import { z } from "zod";
import { type Card, LIST_BATCH, getMyCards } from "@/lib/cards";

// The next batch of a list, asked for by `CardsList` when the reader scrolls near its end. The
// same read the page made for the first batch, with the same filter and a further offset; the
// API says who is asking from the session, so a stranger's call answers 401 and the list stops.
const Input = z.object({
    q: z.string().max(100).optional(),
    collectionId: z.string().max(64).optional(),
    favoritesOnly: z.boolean().optional(),
    wishlist: z.boolean().optional(),
    sort: z.enum(["name", "price", "added", "dex"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    set: z.string().max(100).optional(),
    rarity: z.string().max(100).optional(),
    offset: z.number().int().min(0).max(100_000),
});

export async function loadMoreCards(input: unknown): Promise<Card[]> {
    const parsed = Input.safeParse(input);
    if (!parsed.success) return [];
    const { offset, ...filter } = parsed.data;
    return (await getMyCards({ ...filter, limit: LIST_BATCH, offset })).cards;
}
