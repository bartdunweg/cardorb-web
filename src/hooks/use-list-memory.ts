"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LIST_MEMORY_COOKIE, type ListMemory, type ListMemoryEntry, memoryKey, parseListMemory, serializeListMemory, withEntry } from "@/lib/list-memory";

/**
 * How each list was left: its filters, sort and search, and its View menu, for when you come back.
 *
 * The filters, sort and search live in the list's URL (`?rarity=`, `?sort=`, `?q=`), and every
 * way back to a list, a tab, a sidebar row, a binder's Back link, writes its bare address: set a
 * rarity on the collection, look at the wishlist, tap Collection, and the filter was gone. Bart's
 * call (2026-09-13): a list opens as you left it, and clearing a filter is yours to do. Since
 * 2026-09-16 it survives a reload and a new tab: the memory is a cookie (`list-memory.ts`), the
 * server reads it, and a bare address typed in opens as the list was left too (`list-memory-server.ts`).
 *
 * The View menu's choices are in the same cookie, per page (the collection as a table, a binder as
 * large tiles), where they were one choice for the whole app. The store here is what every list
 * reads, above the pages: the router keeps a page it has shown (and the tab bar's prefetched ones)
 * for a minute (`staleTimes` in next.config.mjs), drawn with the cookie as it was then, so a prop
 * the page carries is only what a list starts from before anything was chosen in this tab.
 *
 * Only the lists remember a query: Home's `?value=` and Settings' `?profile=` are not a way of
 * looking at something, and a set page has its own address per set.
 */
const LISTS = [/^\/dashboard\/(cards|wishlist|favorites|sets)$/, /^\/dashboard\/collections\/[^/]+$/];
const isList = (path: string) => LISTS.some((re) => re.test(path));

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Nothing known on the server: it drew the page from the cookie itself, and hydration agrees. */
const NOTHING: ListMemory = {};

// Read from the cookie the first time anything asks, in the browser only.
let memory: ListMemory | null = null;
const listeners = new Set<() => void>();

const cookieValue = (): string | undefined =>
    document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${LIST_MEMORY_COOKIE}=`))
        ?.slice(LIST_MEMORY_COOKIE.length + 1);

const current = (): ListMemory => {
    memory ??= typeof document === "undefined" ? {} : parseListMemory(cookieValue());
    return memory;
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

/** Writes one page's memory down, here and in the cookie, and tells every list that reads it. */
export const remember = (key: string, patch: ListMemoryEntry) => {
    memory = withEntry(current(), key, patch);
    // The whole site, not only /dashboard: the public profile has a View menu too.
    document.cookie = `${LIST_MEMORY_COOKIE}=${serializeListMemory(memory)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    for (const listener of listeners) listener();
};

/** Where a link to `href` should go: the list as it was left, when the link names the list alone. */
export const withListQuery = (href: string, remembered: ListMemory = current()) => {
    if (href.includes("?") || href.includes("#")) return href;
    const query = remembered[memoryKey(href)]?.query;
    return query ? `${href}?${query}` : href;
};

/** The memory, for a link or a list drawn on the server first. */
export function useListMemory(): ListMemory {
    return useSyncExternalStore(subscribe, current, () => NOTHING);
}

/** Writes down the list's query each time it changes. Mounted once, in the app's layout. */
export function RememberListQuery() {
    const pathname = usePathname();
    const search = useSearchParams().toString();
    useEffect(() => {
        if (!isList(pathname) || (current()[memoryKey(pathname)]?.query ?? "") === search) return;
        remember(memoryKey(pathname), { query: search });
    }, [pathname, search]);
    return null;
}

/** For tests: forget what this module was told. */
export const resetListMemory = () => {
    memory = null;
    for (const listener of listeners) listener();
};
