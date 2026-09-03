/**
 * What a card list reads from its URL and how it writes one back. Sort and page live in the
 * query string so a list is a link: shareable, and the same after a refresh or the back button.
 */

/** One entry per menu option; the API takes `sort` and `order` apart. */
export const SORT_OPTIONS = [
    { value: "set", label: "Set order", sort: undefined, order: undefined },
    { value: "name", label: "Name", sort: "name", order: undefined },
    { value: "price-desc", label: "Price, high to low", sort: "price", order: "desc" },
    { value: "price-asc", label: "Price, low to high", sort: "price", order: "asc" },
    { value: "added-desc", label: "Newest first", sort: "added", order: "desc" },
    { value: "added-asc", label: "Oldest first", sort: "added", order: "asc" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
export type ApiSort = "name" | "price" | "added";
export type ApiOrder = "asc" | "desc";

export type ListQuery = { page: number; sortKey: SortKey; sort: ApiSort | undefined; order: ApiOrder | undefined; q: string | undefined };

const isSortKey = (v: unknown): v is SortKey => SORT_OPTIONS.some((o) => o.value === v);

/** The list's URL, read forgivingly: nonsense means the default, never an error page. */
export function readListQuery(params: { page?: string; sort?: string; q?: string }): ListQuery {
    const sortKey = isSortKey(params.sort) ? params.sort : "set";
    const option = SORT_OPTIONS.find((o) => o.value === sortKey)!;
    const q = params.q?.trim() || undefined;
    return { page: Math.max(1, Number(params.page) || 1), sortKey, sort: option.sort, order: option.order, q };
}

/** The same list with some of it changed; defaults stay out of the URL so the plain path stays plain. */
export function listHref(pathname: string, current: ListQuery, patch: Partial<Pick<ListQuery, "page" | "sortKey" | "q">>): string {
    const q = "q" in patch ? patch.q : current.q;
    const sortKey = patch.sortKey ?? current.sortKey;
    const page = patch.page ?? current.page;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sortKey !== "set") p.set("sort", sortKey);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `${pathname}?${s}` : pathname;
}
