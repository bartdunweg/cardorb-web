/**
 * What a card list reads from its URL and how it writes one back. Sort and page live in the
 * query string so a list is a link: shareable, and the same after a refresh or the back button.
 */

/** One entry per menu option; the API takes `sort` and `order` apart. */
export const SORT_OPTIONS = [
    { value: "set", label: "Newest set first", sort: undefined, order: undefined },
    { value: "name", label: "Name", sort: "name", order: undefined },
    { value: "price-desc", label: "Price, high to low", sort: "price", order: "desc" },
    { value: "price-asc", label: "Price, low to high", sort: "price", order: "asc" },
    { value: "added-desc", label: "Newest first", sort: "added", order: "desc" },
    { value: "added-asc", label: "Oldest first", sort: "added", order: "asc" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
export type SortOption = (typeof SORT_OPTIONS)[number];

/** What a public collection can be sorted by: it carries no price and no date. */
export const PUBLIC_SORT_OPTIONS = SORT_OPTIONS.filter((o) => o.sort === undefined || o.sort === "name");
export type ApiSort = "name" | "price" | "added";
export type ApiOrder = "asc" | "desc";

export type ListQuery = {
    page: number;
    sortKey: SortKey;
    sort: ApiSort | undefined;
    order: ApiOrder | undefined;
    q: string | undefined;
    /** One set, as the API names it; the API matches it whole. */
    set: string | undefined;
    rarity: string | undefined;
};

const isSortKey = (v: unknown): v is SortKey => SORT_OPTIONS.some((o) => o.value === v);

/** The list's URL, read forgivingly: nonsense means the default, never an error page. */
export function readListQuery(params: { page?: string; sort?: string; q?: string; set?: string; rarity?: string }): ListQuery {
    const sortKey = isSortKey(params.sort) ? params.sort : "set";
    const option = SORT_OPTIONS.find((o) => o.value === sortKey)!;
    const text = (v: string | undefined) => v?.trim().slice(0, 100) || undefined;
    return {
        page: Math.max(1, Number(params.page) || 1),
        sortKey,
        sort: option.sort,
        order: option.order,
        q: text(params.q),
        set: text(params.set),
        rarity: text(params.rarity),
    };
}

/** A public list's URL: as the owner's, except a sort the public route refuses falls back to set order. */
export function readPublicListQuery(params: Parameters<typeof readListQuery>[0]): ListQuery {
    const query = readListQuery(params);
    return PUBLIC_SORT_OPTIONS.some((o) => o.value === query.sortKey) ? query : { ...query, sortKey: "set", sort: undefined, order: undefined };
}

/** The same list with some of it changed; defaults stay out of the URL so the plain path stays plain. */
export function listHref(pathname: string, current: ListQuery, patch: Partial<Pick<ListQuery, "page" | "sortKey" | "q" | "set" | "rarity">>): string {
    const q = "q" in patch ? patch.q : current.q;
    const set = "set" in patch ? patch.set : current.set;
    const rarity = "rarity" in patch ? patch.rarity : current.rarity;
    const sortKey = patch.sortKey ?? current.sortKey;
    const page = patch.page ?? current.page;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sortKey !== "set") p.set("sort", sortKey);
    if (set) p.set("set", set);
    if (rarity) p.set("rarity", rarity);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `${pathname}?${s}` : pathname;
}
