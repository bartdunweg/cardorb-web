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
    // By what a card's price did over a period (`period`, or `from` and `to`), times the copies held.
    { value: "change-desc", label: "Biggest gain", sort: "change", order: "desc" },
    { value: "change-asc", label: "Biggest loss", sort: "change", order: "asc" },
] as const;

/**
 * The periods a change sort reads over: the value chart's, and `custom` for two days of your own
 * (`from` and `to`). Here and not beside the chart, which is a client module: a server page reading
 * a value out of one gets a reference, not the value (cards-view.ts says how that went once).
 */
export const CHANGE_PERIODS = [
    { key: "7d", label: "7D", said: "Last 7 days", days: 7 },
    { key: "1m", label: "1M", said: "Last 30 days", days: 30 },
    { key: "3m", label: "3M", said: "Last 3 months", days: 91 },
    { key: "6m", label: "6M", said: "Last 6 months", days: 182 },
    { key: "max", label: "Max", said: "Since the first reading", days: null },
] as const;
export type ChangePeriod = (typeof CHANGE_PERIODS)[number]["key"] | "custom";
const DEFAULT_CHANGE_PERIOD: ChangePeriod = "1m";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The days a change sort compares, as the API takes them: `to` left out is today. */
export function changeWindow(q: Pick<ListQuery, "period" | "from" | "to">): { from: string; to?: string } {
    if (q.period === "custom" && q.from) return { from: q.from, to: q.to };
    const period = CHANGE_PERIODS.find((p) => p.key === q.period) ?? CHANGE_PERIODS[1];
    if (period.days === null) return { from: "2000-01-01" };
    const d = new Date();
    d.setDate(d.getDate() - period.days);
    return { from: d.toISOString().slice(0, 10) };
}

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];
export type SortOption = (typeof SORT_OPTIONS)[number];

/** What a public collection can be sorted by: it carries no price, and its dates stay with the owner. */
export const PUBLIC_SORT_OPTIONS = SORT_OPTIONS.filter((o) => o.sort === undefined || o.sort === "name" || o.value === "added-desc");
export type ApiSort = "name" | "price" | "added" | "dex" | "change";
export type ApiOrder = "asc" | "desc";

export type ListQuery = {
    page: number;
    sortKey: SortKey;
    sort: ApiSort | undefined;
    order: ApiOrder | undefined;
    /** A change sort's period; `custom` reads `from` and `to`. */
    period: ChangePeriod;
    from: string | undefined;
    to: string | undefined;
    q: string | undefined;
    /** The sets, as the API names them; a card in any of them. None: every set. */
    set: string[];
    /** The rarities; a card of any of them. */
    rarity: string[];
    /**
     * Only the cards whose illustration covers the whole card. Not a rarity: it cuts across
     * them, one full art being an Ultra Rare and the next an illustration rare. The API works
     * it out per set and keeps the answer (`@/lib/full-art` says why the rarity will not do).
     */
    fullArt: boolean;
    /** The generations, as the catalogue names its series; a card from any of them. */
    gen: string[];
    /** The energy types, as the catalogue names them; a card of any of them. */
    type: string[];
    /** A copy's conditions ("Near Mint"); a copy in any of them. */
    condition: string[];
    /** A copy's finishes ("holo"); a copy with any of them. */
    finish: string[];
    /** A copy's languages, as codes ("ja"); a copy in any of them. */
    language: string[];
    /** A public profile's folder, by id; the owner's own lists carry the folder in the path instead. */
    folder: string | undefined;
    /** A public profile's wishlist, favorites or Pokédex instead of its collection. */
    list: PublicList | undefined;
    /** Only the printings held more than once: the copies to trade or sell. The API counts them over the whole collection. */
    duplicates: boolean;
};

/** The lists a public profile can show beside the collection, each behind its own setting. */
const PUBLIC_LISTS = ["wishlist", "favorites"] as const;
export type PublicList = (typeof PUBLIC_LISTS)[number];

/** What a list page reads from its URL. */
export type ListSearchParams = {
    page?: string;
    sort?: string;
    period?: string;
    from?: string;
    to?: string;
    q?: string;
    /* A filter chosen twice comes as two of the same key (`?rarity=Rare&rarity=Promo`), which
       Next hands over as an array. */
    set?: string | string[];
    rarity?: string | string[];
    fullArt?: string;
    gen?: string | string[];
    type?: string | string[];
    condition?: string | string[];
    finish?: string | string[];
    language?: string | string[];
    folder?: string;
    list?: string;
    duplicates?: string;
};

/** A search or a filter is on. */
export const isNarrowed = (q: ListQuery): boolean =>
    [q.q, q.fullArt, q.duplicates].some(Boolean) || [q.set, q.rarity, q.gen, q.type, q.condition, q.finish, q.language].some((values) => values.length > 0);

/** More than this per filter is not a choice anybody made by hand; the API refuses past fifty. */
const MAX_VALUES = 50;

const isSortKey = (v: unknown): v is SortKey => SORT_OPTIONS.some((o) => o.value === v);

/** The list's URL, read forgivingly: nonsense means the default, never an error page. */
/** A hundred cards a page, so this is a million cards in. Nobody's collection is a tenth of it. */
export const MAX_PAGE = 10_000;

export function readListQuery(params: ListSearchParams): ListQuery {
    const sortKey = isSortKey(params.sort) ? params.sort : "set";
    const option = SORT_OPTIONS.find((o) => o.value === sortKey)!;
    const text = (v: string | undefined) => v?.trim().slice(0, 100) || undefined;
    const texts = (v: string | string[] | undefined): string[] =>
        [...new Set((Array.isArray(v) ? v : v === undefined ? [] : [v]).map((one) => one.trim().slice(0, 100)).filter(Boolean))].slice(0, MAX_VALUES);
    return {
        // Capped: every distinct page is a cache miss and one call to an API in another region,
        // and nothing here has ten thousand pages. Unbounded, `?page=` was a free way for anyone
        // to walk the public profile and bill both.
        page: Math.min(MAX_PAGE, Math.max(1, Number(params.page) || 1)),
        sortKey,
        sort: option.sort,
        order: option.order,
        ...readPeriod(params),
        q: text(params.q),
        set: texts(params.set),
        rarity: texts(params.rarity),
        fullArt: params.fullArt === "1",
        gen: texts(params.gen),
        type: texts(params.type),
        condition: texts(params.condition),
        finish: texts(params.finish),
        language: texts(params.language),
        folder: text(params.folder),
        list: (PUBLIC_LISTS as readonly string[]).includes(params.list ?? "") ? (params.list as PublicList) : undefined,
        duplicates: params.duplicates === "1",
    };
}

/** A change sort's period from the URL: a known key, or `custom` with a valid `from` (and `to` not before it). */
function readPeriod(params: ListSearchParams): Pick<ListQuery, "period" | "from" | "to"> {
    const from = params.from && ISO_DAY.test(params.from) ? params.from : undefined;
    const to = params.to && ISO_DAY.test(params.to) && (!from || params.to >= from) ? params.to : undefined;
    if (params.period === "custom" && from) return { period: "custom", from, to };
    const known = CHANGE_PERIODS.some((p) => p.key === params.period);
    return { period: known ? (params.period as ChangePeriod) : DEFAULT_CHANGE_PERIOD, from: undefined, to: undefined };
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
    patch: Partial<
        Pick<
            ListQuery,
            | "page"
            | "sortKey"
            | "period"
            | "from"
            | "to"
            | "q"
            | "set"
            | "rarity"
            | "fullArt"
            | "gen"
            | "type"
            | "condition"
            | "finish"
            | "language"
            | "folder"
            | "list"
            | "duplicates"
        >
    >,
    /** The sort this page reads a bare URL as; anything else is written into it. */
    defaultSortKey: SortKey = "set",
): string {
    const q = "q" in patch ? patch.q : current.q;
    const set = "set" in patch ? patch.set : current.set;
    const rarity = "rarity" in patch ? patch.rarity : current.rarity;
    const fullArt = "fullArt" in patch ? patch.fullArt : current.fullArt;
    const gen = "gen" in patch ? patch.gen : current.gen;
    const type = "type" in patch ? patch.type : current.type;
    const condition = "condition" in patch ? patch.condition : current.condition;
    const finish = "finish" in patch ? patch.finish : current.finish;
    const language = "language" in patch ? patch.language : current.language;
    const folder = "folder" in patch ? patch.folder : current.folder;
    const list = "list" in patch ? patch.list : current.list;
    const duplicates = "duplicates" in patch ? patch.duplicates : current.duplicates;
    const sortKey = patch.sortKey ?? current.sortKey;
    const period = "period" in patch ? (patch.period ?? DEFAULT_CHANGE_PERIOD) : current.period;
    const from = "from" in patch ? patch.from : current.from;
    const to = "to" in patch ? patch.to : current.to;
    const page = patch.page ?? current.page;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sortKey !== defaultSortKey) p.set("sort", sortKey);
    // The period only means something to a change sort, and only leaves the URL plain at its default.
    if (sortKey.startsWith("change-")) {
        if (period === "custom" && from) {
            p.set("period", "custom");
            p.set("from", from);
            if (to) p.set("to", to);
        } else if (period !== DEFAULT_CHANGE_PERIOD && period !== "custom") p.set("period", period);
    }
    for (const one of set ?? []) p.append("set", one);
    for (const one of rarity ?? []) p.append("rarity", one);
    if (fullArt) p.set("fullArt", "1");
    for (const one of gen ?? []) p.append("gen", one);
    for (const one of type ?? []) p.append("type", one);
    for (const one of condition ?? []) p.append("condition", one);
    for (const one of finish ?? []) p.append("finish", one);
    for (const one of language ?? []) p.append("language", one);
    if (folder) p.set("folder", folder);
    if (list) p.set("list", list);
    if (duplicates) p.set("duplicates", "1");
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `${pathname}?${s}` : pathname;
}
