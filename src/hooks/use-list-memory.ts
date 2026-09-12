"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * The filters, sort and search a list had when you left it, for when you come back.
 *
 * They live in the list's URL (`?rarity=`, `?sort=`, `?q=`), and every way back to a list, a tab,
 * a sidebar row, a binder's Back link, writes its bare address: set a rarity on the collection,
 * look at the wishlist, tap Collection, and the filter was gone. Bart's call (2026-09-13): a list
 * opens as you left it, and clearing a filter is yours to do.
 *
 * Per list and per browser tab, in memory: a reload starts from the address it reloads, and a
 * list you cleared is remembered as cleared. Only the lists: Home's `?value=` and Settings'
 * `?profile=` are not a way of looking at something, and a set page has its own address per set.
 */
const LISTS = [/^\/dashboard\/(cards|wishlist|favorites|sets)$/, /^\/dashboard\/collections\/[^/]+$/];
const isList = (path: string) => LISTS.some((re) => re.test(path));

let queries: Record<string, string> = {};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const EMPTY: Record<string, string> = {};

/** Where a link to `href` should go: the list as it was left, when the link names the list alone. */
export const withListQuery = (href: string, remembered: Record<string, string> = queries) => {
    if (href.includes("?") || href.includes("#")) return href;
    const query = remembered[href];
    return query ? `${href}?${query}` : href;
};

/** The remembered queries, for a link drawn on the server first: nothing there, so hydration agrees. */
export function useListQueries() {
    return useSyncExternalStore(
        subscribe,
        () => queries,
        () => EMPTY,
    );
}

/** Writes down the list's query each time it changes. Mounted once, in the app's layout. */
export function RememberListQuery() {
    const pathname = usePathname();
    const search = useSearchParams().toString();
    useEffect(() => {
        if (!isList(pathname) || (queries[pathname] ?? "") === search) return;
        queries = { ...queries, [pathname]: search };
        for (const listener of listeners) listener();
    }, [pathname, search]);
    return null;
}
