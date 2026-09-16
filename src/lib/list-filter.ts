import { z } from "zod";
import type { CardFilter } from "@/lib/cards";

/**
 * What a further batch of a list may carry: the filter the page read its first batch with, and
 * how far down the list to start.
 *
 * The shape is typed as a whole record of `CardFilter`, which is the point of the file. `gen`,
 * `type` and `number` were missing here while every list page passed them, and `z.object` strips
 * what it does not know rather than complaining, so the first 48 cards were the generation you
 * asked for and everything after it was the whole collection, with no error anywhere. Written
 * this way, a filter added to `CardFilter` and forgotten here is a type error at build time.
 *
 * `facets` is left out on purpose: a batch on scroll never reads them, and `loadMoreCards` sets
 * it to false itself.
 */
/** One value or several, as a filter chosen more than once carries them. */
const choices = z.union([z.string().max(100), z.array(z.string().max(100)).max(50)]).optional();

const filterShape: { [K in keyof Required<Omit<CardFilter, "facets">>]: z.ZodType<CardFilter[K]> } = {
    q: z.string().max(100).optional(),
    collectionId: z.string().max(64).optional(),
    favoritesOnly: z.boolean().optional(),
    wishlist: z.boolean().optional(),
    sort: z.enum(["name", "price", "added", "dex", "change"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    set: choices,
    rarity: choices,
    fullArt: z.boolean().optional(),
    gen: choices,
    type: choices,
    condition: choices,
    finish: choices,
    language: choices,
    number: z.string().max(20).optional(),
    duplicates: z.boolean().optional(),
};

export const loadMoreInput = z.object({
    ...filterShape,
    offset: z.number().int().min(0).max(100_000),
});

/**
 * Which list to warm, for `warmList`: the three the navigation leads to whose first batch is one
 * read of the API. Named, not a filter, so nothing but these three can be asked for.
 */
export const warmListInput = z.object({ list: z.enum(["collection", "wishlist", "favorites"]) });

const titleChoice = z.string().trim().min(1).max(100).optional();

/**
 * Which list a title suggestion may come from, for `collectionIndex` and `suggestCardTitles`: the
 * binder the field sits on, with its filters still on. Here rather than beside them for the reason
 * `loadMoreInput` is: the read route checks the same shape before it asks.
 */
export const titleScope = z.object({
    collectionId: titleChoice,
    wishlist: z.boolean().optional(),
    favoritesOnly: z.boolean().optional(),
    set: z.union([titleChoice, z.array(z.string().trim().min(1).max(100)).max(50)]),
    rarity: z.union([titleChoice, z.array(z.string().trim().min(1).max(100)).max(50)]),
});
