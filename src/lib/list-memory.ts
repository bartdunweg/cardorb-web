import { z } from "zod";

/**
 * What each list page remembers of how you left it: the layout, the tile size, the set headings
 * and the query string (sort, filters, search). One cookie for all of them, keyed by page, so a
 * choice on the wishlist is the wishlist's and the collection keeps its own (Bart's call,
 * 2026-09-16: per page, not across the app). A cookie rather than localStorage for the reason
 * `cards-view.ts` gives: the server draws the page as it was left, with no swap after hydration.
 *
 * This module has no directive: the server reads the cookie and the browser writes it, and both
 * read a plain value out of it (cards-view.ts says what a client module would hand back instead).
 */
export const LIST_MEMORY_COOKIE = "list-memory";

const entry = z
    .object({
        view: z.enum(["table", "grid"]),
        size: z.enum(["sm", "md", "lg"]),
        group: z.enum(["sets", "none"]),
        /** The page's query string without its `?`, as `use-list-memory` records it. */
        query: z.string().max(2000),
    })
    .partial();

export type ListMemoryEntry = z.infer<typeof entry>;

/** Keyed by page; insertion order is age, the last entry the most recently touched. */
export type ListMemory = Record<string, ListMemoryEntry>;

const memory = z.record(z.string().min(1).max(200), entry);

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

const decode = (raw: string): string => {
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
};

/** The cookie's value, read forgivingly: anything but a well-formed memory is an empty one. */
export function parseListMemory(raw: string | undefined): ListMemory {
    if (!raw) return {};
    try {
        const parsed = memory.safeParse(JSON.parse(decode(raw)));
        return parsed.success ? parsed.data : {};
    } catch {
        return {};
    }
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
