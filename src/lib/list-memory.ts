/**
 * What each list page remembers of how you left it: the layout, the tile size, the set headings
 * and the query string, which is the sort, the filters, the grouping and Browse's catalogue, but
 * not the search term (`rememberedQuery` below says why). One cookie for all of them, keyed by page, so a
 * choice on the wishlist is the wishlist's and the collection keeps its own (Bart's call,
 * 2026-09-16: per page, not across the app). A cookie rather than localStorage for the reason
 * `cards-view.ts` gives: the server draws the page as it was left, with no swap after hydration.
 *
 * This module has no directive: the server reads the cookie and the browser writes it, and both
 * read a plain value out of it (cards-view.ts says what a client module would hand back instead).
 *
 * No zod here: this file reaches every page's first load through the router provider, and zod is
 * the largest thing it would bring. The server parses the cookie with the zod schema in
 * `list-memory-server.ts`, the boundary R-DATA-001 names; the browser reads the cookie it wrote
 * itself with the guard below, which answers the same as that schema (list-memory-server.test.ts).
 */
export const LIST_MEMORY_COOKIE = "list-memory";

export const LIST_VIEWS = ["table", "grid"] as const;
export const LIST_SIZES = ["sm", "md", "lg"] as const;
export const LIST_GROUPS = ["sets", "none"] as const;
export const MAX_QUERY_LENGTH = 2000;
export const MAX_KEY_LENGTH = 200;

export type ListMemoryEntry = {
    view?: (typeof LIST_VIEWS)[number];
    size?: (typeof LIST_SIZES)[number];
    group?: (typeof LIST_GROUPS)[number];
    /** The page's query string without its `?` and without its search term, as `rememberedQuery` leaves it. */
    query?: string;
};

/** Keyed by page; insertion order is age, the last entry the most recently touched. */
export type ListMemory = Record<string, ListMemoryEntry>;

const oneOf = (values: readonly string[], value: unknown): boolean => value === undefined || (typeof value === "string" && values.includes(value));

/** One page's entry with its unknown keys left out, or null when a known one has the wrong shape. */
function readEntry(value: unknown): ListMemoryEntry | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const { view, size, group, query } = value as Record<string, unknown>;
    if (!oneOf(LIST_VIEWS, view) || !oneOf(LIST_SIZES, size) || !oneOf(LIST_GROUPS, group)) return null;
    if (query !== undefined && (typeof query !== "string" || query.length > MAX_QUERY_LENGTH)) return null;
    const read = { view, size, group, query } as ListMemoryEntry;
    for (const name of Object.keys(read) as (keyof ListMemoryEntry)[]) if (read[name] === undefined) delete read[name];
    return read;
}

/**
 * A cookie past 4 KB is dropped whole by the browser, and the request headers have a ceiling too.
 * Under this the whole thing stays well inside both; past it the oldest pages are forgotten first.
 */
export const MAX_COOKIE_LENGTH = 3000;

/**
 * Which page a memory belongs to. A binder is a page of its own, and so is a public profile; the
 * set pages are one page, so a size chosen on one set holds on the next.
 */
export const memoryKey = (pathname: string): string => (/^\/dashboard\/sets\/[^/]+$/.test(pathname) ? "/dashboard/sets/*" : pathname);

/**
 * The search field's term and the page the pager is on: the two things a list does not remember.
 * The page goes with the term, as it does in the search field itself (cards-search.tsx): without
 * the term the pages are other pages, and page 2 of them is a screenful from the middle of the
 * list with nothing saying why.
 */
const FORGOTTEN_PARAMS = ["q", "page"];

/**
 * A list's query with those two taken out: the sort, the filters, the grouping and Browse's
 * catalogue are remembered, the term never is (Bart's call, 2026-09-20). A filter is how you keep
 * a list; a term is a question asked once, and days later Browse still opened on "30th" with
 * nothing on screen saying where that came from. Within a visit the term still comes back, because
 * it is in the address the browser holds: Back, Forward, a reload and a shared link all keep it.
 *
 * Read as well as written through here, so a cookie written before this still answers without the
 * term it holds; the next write leaves it out for good.
 */
export function rememberedQuery(query: string | undefined | null): string {
    if (!query) return "";
    const params = new URLSearchParams(query);
    if (!FORGOTTEN_PARAMS.some((name) => params.has(name))) return query;
    for (const name of FORGOTTEN_PARAMS) params.delete(name);
    return params.toString();
}

const decode = (raw: string): string => {
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
};

/** The cookie's JSON, or undefined when there is none or it is not JSON. */
export function listMemoryJson(raw: string | undefined): unknown {
    if (!raw) return undefined;
    try {
        return JSON.parse(decode(raw));
    } catch {
        return undefined;
    }
}

/** The cookie's value, read forgivingly: anything but a well-formed memory is an empty one. */
export function parseListMemory(raw: string | undefined): ListMemory {
    const json = listMemoryJson(raw);
    if (typeof json !== "object" || json === null || Array.isArray(json)) return {};
    const read: ListMemory = {};
    for (const [key, value] of Object.entries(json)) {
        const entry = readEntry(value);
        if (key.length < 1 || key.length > MAX_KEY_LENGTH || !entry) return {};
        read[key] = entry;
    }
    return read;
}

/** Nothing worth a byte: a default is left out of an entry, so an empty one says nothing. */
const isBlank = (e: ListMemoryEntry): boolean => Object.keys(e).length === 0;

/**
 * The memory with one page's entry changed. The page moves to the end (the newest), and a value
 * set to `undefined` or an empty query is dropped from it, so a cleared list is a page with no query.
 */
export function withEntry(current: ListMemory, key: string, patch: ListMemoryEntry): ListMemory {
    const merged: ListMemoryEntry = { ...current[key], ...patch };
    for (const name of Object.keys(merged) as (keyof ListMemoryEntry)[]) {
        if (merged[name] === undefined || merged[name] === "") delete merged[name];
    }
    const rest = Object.fromEntries(Object.entries(current).filter(([name]) => name !== key));
    return isBlank(merged) ? rest : { ...rest, [key]: merged };
}

/**
 * The cookie's value: the memory as JSON, encoded, the oldest pages dropped until it fits.
 * A single entry too long on its own (a filter of fifty sets) is dropped like any other.
 */
export function serializeListMemory(current: ListMemory): string {
    let entries = Object.entries(current).filter(([, e]) => !isBlank(e));
    while (entries.length > 0) {
        const text = encodeURIComponent(JSON.stringify(Object.fromEntries(entries)));
        if (text.length <= MAX_COOKIE_LENGTH) return text;
        entries = entries.slice(1);
    }
    return "";
}
