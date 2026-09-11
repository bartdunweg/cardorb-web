"use client";

import { useSyncExternalStore } from "react";

/**
 * The last few terms typed into a card search, kept in this browser so the box has something
 * to offer before a letter is typed: most searches are for a card looked for before. Five,
 * newest first, for the palette, and told about across tabs the way
 * the theme is (providers/theme.tsx): localStorage, a storage event, and an event of our own
 * for this tab. Nothing leaves the browser.
 */
const STORAGE_KEY = "recent-searches";
const CHANGE_EVENT = "recent-searches-change";
export const MAX_RECENT_SEARCHES = 5;
/** Shorter than a search asks for is not a search worth keeping. */
const MIN_LENGTH = 2;

const EMPTY: readonly string[] = [];
// The snapshot must be the same array for the same stored value, or React re-renders forever.
let last: { raw: string | null; terms: readonly string[] } = { raw: null, terms: EMPTY };

const readStored = (): readonly string[] => {
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {
        return EMPTY;
    }
    if (raw === last.raw) return last.terms;
    let terms: readonly string[] = EMPTY;
    try {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed))
            terms = parsed.filter((t): t is string => typeof t === "string" && t.trim().length >= MIN_LENGTH).slice(0, MAX_RECENT_SEARCHES);
    } catch {
        /* not ours: nothing to offer */
    }
    last = { raw, terms };
    return terms;
};

const subscribe = (onChange: () => void) => {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
};

const write = (terms: readonly string[]) => {
    try {
        if (terms.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
        else localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* no storage: nothing to keep, the box stays as it is */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

/** A term just searched for, to the front; the same term again, case aside, moves rather than doubles. */
export function rememberSearch(term: string) {
    const clean = term.trim();
    if (clean.length < MIN_LENGTH) return;
    const rest = readStored().filter((t) => t.toLowerCase() !== clean.toLowerCase());
    write([clean, ...rest].slice(0, MAX_RECENT_SEARCHES));
}

export function forgetSearch(term: string) {
    write(readStored().filter((t) => t !== term));
}

export function clearSearches() {
    write(EMPTY);
}

/** The terms, newest first; empty on the server and in a browser that keeps nothing. */
export function useRecentSearches(): readonly string[] {
    return useSyncExternalStore(subscribe, readStored, () => EMPTY);
}
