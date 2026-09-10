/**
 * What a card list reads from its URL and how it writes one back. Sort and page live in the
 * query string so a list is a link: shareable, and the same after a refresh or the back button.
 */

/** One entry per menu option; the API takes `sort` and `order` apart. */
export const SORT_OPTIONS = [
    { value: "name", label: "Name", sort: "name", order: undefined },
    { value: "set", label: "Set", sort: undefined, order: undefined },
    { value: "dex", label: "Pokédex number", sort: "dex", order: undefined },
    { value: "added-desc", label: "Newest first", sort: "added", order: "desc" },
    { value: "added-asc", label: "Oldest first", sort: "added", order: "asc" },
    { value: "price-desc", label: "Highest price", sort: "price", order: "desc" },
    { value: "price-asc", label: "Lowest price", sort: "price", order: "asc" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
export type SortOption = (typeof SORT_OPTIONS)[number];

/** What a public collection can be sorted by: it carries no price, and its dates stay with the owner. */
export const PUBLIC_SORT_OPTIONS = SORT_OPTIONS.filter((o) => o.sort === undefined || o.sort === "name" || o.value === "added-desc");
export type ApiSort = "name" | "price" | "added" | "dex";
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
    /** One generation, as the catalogue names its series; the API matches it whole. */
    gen: string | undefined;
    /** One energy type, as the catalogue names it; the API matches it whole. */
    type: string | undefined;
    /** A public profile's folder, by id; the owner's own lists carry the folder in the path instead. */
    folder: string | undefined;
    /** A public profile's wishlist, favorites or Pokédex instead of its collection. */
    list: PublicList | undefined;
    /** Only the copies nothing prices: what the total leaves out. */
    unpriced: boolean;
};

/** The lists a public profile can show beside the collection, each behind its own setting. */
const PUBLIC_LISTS = ["wishlist", "favorites", "pokedex"] as const;
export type PublicList = (typeof PUBLIC_LISTS)[number];

/** What a list page reads from its URL. */
export type ListSearchParams = {
    page?: string;
    sort?: string;
    q?: string;
    set?: string;
    rarity?: string;
    gen?: string;
    type?: string;
    folder?: string;
    list?: string;
    unpriced?: string;
};

/** A search or a filter is on. */
export const isNarrowed = (q: ListQuery): boolean => [q.q, q.set, q.rarity, q.gen, q.type, q.unpriced].some(Boolean);

const isSortKey = (v: unknown): v is SortKey => SORT_OPTIONS.some((o) => o.value === v);

/** The list's URL, read forgivingly: nonsense means the default, never an error page. */
/** A hundred cards a page, so this is a million cards in. Nobody's collection is a tenth of it. */
export const MAX_PAGE = 10_000;

export function readListQuery(params: ListSearchParams): ListQuery {
    const sortKey = isSortKey(params.sort) ? params.sort : "set";
    const option = SORT_OPTIONS.find((o) => o.value === sortKey)!;
    const text = (v: string | undefined) => v?.trim().slice(0, 100) || undefined;
    return {
        // Capped: every distinct page is a cache miss and one call to an API in another region,
        // and nothing here has ten thousand pages. Unbounded, `?page=` was a free way for anyone
        // to walk the public profile and bill both.
        page: Math.min(MAX_PAGE, Math.max(1, Number(params.page) || 1)),
        sortKey,
        sort: option.sort,
        order: option.order,
        q: text(params.q),
        set: text(params.set),
        rarity: text(params.rarity),
        gen: text(params.gen),
        type: text(params.type),
        folder: text(params.folder),
        list: (PUBLIC_LISTS as readonly string[]).includes(params.list ?? "") ? (params.list as PublicList) : undefined,
        unpriced: params.unpriced === "1",
    };
}

/**
 * A profile opens on what its owner pulled last, so a public list with no sort in its URL is
 * newest first; the sort menu still offers set order and by name, and either goes in the URL.
 */
export const PUBLIC_DEFAULT_SORT: SortKey = "added-desc";

/** A public list's URL: as the owner's, except a sort the public route refuses falls back to the default. */
export function readPublicListQuery(params: Parameters<typeof readListQuery>[0]): ListQuery {
    const asked = isSortKey(params.sort) ? params.sort : PUBLIC_DEFAULT_SORT;
    const option = SORT_OPTIONS.find((o) => o.value === asked)!;
    const query = { ...readListQuery(params), sortKey: asked, sort: option.sort, order: option.order };
    if (PUBLIC_SORT_OPTIONS.some((o) => o.value === asked)) return query;
    const fallback = SORT_OPTIONS.find((o) => o.value === PUBLIC_DEFAULT_SORT)!;
    return { ...query, sortKey: PUBLIC_DEFAULT_SORT, sort: fallback.sort, order: fallback.order };
}

/** The same list with some of it changed; defaults stay out of the URL so the plain path stays plain. */
export function listHref(
    pathname: string,
    current: ListQuery,
    patch: Partial<Pick<ListQuery, "page" | "sortKey" | "q" | "set" | "rarity" | "gen" | "type" | "folder" | "list" | "unpriced">>,
    /** The sort this page reads a bare URL as; anything else is written into it. */
    defaultSortKey: SortKey = "set",
): string {
    const q = "q" in patch ? patch.q : current.q;
    const set = "set" in patch ? patch.set : current.set;
    const rarity = "rarity" in patch ? patch.rarity : current.rarity;
    const gen = "gen" in patch ? patch.gen : current.gen;
    const type = "type" in patch ? patch.type : current.type;
    const folder = "folder" in patch ? patch.folder : current.folder;
    const list = "list" in patch ? patch.list : current.list;
    const unpriced = "unpriced" in patch ? patch.unpriced : current.unpriced;
    const sortKey = patch.sortKey ?? current.sortKey;
    const page = patch.page ?? current.page;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sortKey !== defaultSortKey) p.set("sort", sortKey);
    if (set) p.set("set", set);
    if (rarity) p.set("rarity", rarity);
    if (gen) p.set("gen", gen);
    if (type) p.set("type", type);
    if (folder) p.set("folder", folder);
    if (list) p.set("list", list);
    if (unpriced) p.set("unpriced", "1");
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `${pathname}?${s}` : pathname;
}
