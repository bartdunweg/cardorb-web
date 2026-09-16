/**
 * What a set page reads from its URL and how it writes one back: the search, the tab (what you
 * hold), the rarities, full art and the sort. In the address so a refresh, a shared link and a
 * tab restored by the browser open the set as it was left, the way every other list does. The
 * page still narrows the cards it already holds; only the choices travel.
 */

export type SetHolding = "owned" | "missing" | "wishlist";
const HOLDINGS: readonly SetHolding[] = ["owned", "missing", "wishlist"];

export type SetSortKey = "set" | "name" | "price-desc" | "price-asc";
export const SET_SORTS: { value: SetSortKey; label: string }[] = [
    { value: "set", label: "Set order" },
    { value: "name", label: "Name" },
    { value: "price-desc", label: "Price, high to low" },
    { value: "price-asc", label: "Price, low to high" },
];
const isSetSort = (v: unknown): v is SetSortKey => SET_SORTS.some((o) => o.value === v);

export type SetQuery = {
    /** What was typed, as typed; empty is nothing searched. */
    q: string;
    /** The tab: what you hold; undefined is All. */
    holding: SetHolding | undefined;
    /** The rarities, a card of any; none is every rarity. */
    rarity: string[];
    /** Only the cards whose illustration covers the whole card. */
    fullArt: boolean;
    sort: SetSortKey;
};

/** More than this is no choice anybody made by hand. */
const MAX_VALUES = 50;

/** The set page's URL, read forgivingly: nonsense means the default, never an error page. */
export function readSetQuery(params: URLSearchParams): SetQuery {
    const holding = params.get("holding");
    return {
        q: (params.get("q") ?? "").slice(0, 100),
        holding: (HOLDINGS as readonly string[]).includes(holding ?? "") ? (holding as SetHolding) : undefined,
        rarity: [
            ...new Set(
                params
                    .getAll("rarity")
                    .map((r) => r.trim().slice(0, 100))
                    .filter(Boolean),
            ),
        ].slice(0, MAX_VALUES),
        fullArt: params.get("fullArt") === "1",
        sort: isSetSort(params.get("sort")) ? (params.get("sort") as SetSortKey) : "set",
    };
}

/**
 * The same address with the set page's choices written over it. Everything else in it stays
 * (`?language=`); a default stays out, so a set opened plain keeps its plain address.
 */
export function writeSetQuery(params: URLSearchParams, query: SetQuery): URLSearchParams {
    const p = new URLSearchParams(params);
    for (const key of ["q", "holding", "rarity", "fullArt", "sort"]) p.delete(key);
    const q = query.q.trim();
    if (q) p.set("q", q);
    if (query.holding) p.set("holding", query.holding);
    for (const one of query.rarity) p.append("rarity", one);
    if (query.fullArt) p.set("fullArt", "1");
    if (query.sort !== "set") p.set("sort", query.sort);
    return p;
}
