import type { CardFilter } from "@/lib/cards";

/*
 * The list Home is about: the collection ("all"), the wishlist, the favorites or one binder by its id.
 * The title's list choice puts it in the address (`?value=`), and every part of Home that can
 * follows it: the value and its line, the four counts, the dearest cards.
 */

export type HomeList = string;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the address asks for, read forgivingly: anything else is the collection. */
export const askedList = (value: string | undefined): HomeList =>
    value === "favorites" || value === "wishlist" || (value && UUID.test(value)) ? value : "all";

/** The cards of a list, as a filter for the list reads. The collection is the whole of what you own. */
export function listFilter(list: HomeList): Pick<CardFilter, "favoritesOnly" | "wishlist" | "collectionId"> {
    if (list === "favorites") return { favoritesOnly: true };
    if (list === "wishlist") return { wishlist: true };
    if (list === "all") return {};
    return { collectionId: list };
}

/** The page that lists a list's cards: where its counts and its "See all" lead. */
export function listPath(list: HomeList): string {
    if (list === "favorites") return "/dashboard/favorites";
    if (list === "wishlist") return "/dashboard/wishlist";
    if (list === "all") return "/dashboard/cards";
    return `/dashboard/collections/${list}`;
}
