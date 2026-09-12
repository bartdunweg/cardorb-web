"use client";

import { useSyncExternalStore } from "react";

/**
 * The last few things searched for in one list, kept in this browser so a field has something to
 * offer before a letter is typed. A term is remembered when it is meant: Enter on what was typed,
 * or a suggestion taken. Not on the way there, or a search for "Charizard" would be remembered
 * as "c", "ch", "cha" and "char" as well.
 *
 * Per list, because the wishlist and a binder are different questions, and told about across tabs
 * the way the theme is (`providers/theme.tsx`): localStorage, a storage event, and an event of our
 * own for this tab. Nothing leaves the browser.
 */
const STORAGE_KEY = "recent-terms";
const CHANGE_EVENT = "recent-terms-change";
export const MAX_RECENT_TERMS = 5;

const EMPTY: readonly string[] = [];
// The snapshot must be the same array for the same stored value, or React re-renders forever.
let last: { raw: string | null; byList: Record<string, readonly string[]> } = { raw: null, byList: {} };

const readAll = (): Record<string, readonly string[]> => {
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
    } catch {
        return {};
    }
    if (raw === last.raw) return last.byList;
    const byList: Record<string, readonly string[]> = {};
    try {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        // What is in localStorage was written by us, but a version ago, or by nobody (R-DATA-001).
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
            for (const [list, terms] of Object.entries(parsed as Record<string, unknown>))
                if (Array.isArray(terms)) byList[list] = terms.filter((t): t is string => typeof t === "string" && t.length > 0).slice(0, MAX_RECENT_TERMS);
    } catch {
        /* not ours: nothing to offer */
    }
    last = { raw, byList };
    return byList;
};

const subscribe = (onChange: () => void) => {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
};

/** A term just searched for, to the front of its list; the same term again moves rather than doubles. */
export function rememberTerm(list: string, term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const all = readAll();
    const kept = [trimmed, ...(all[list] ?? []).filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT_TERMS);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [list]: kept }));
    } catch {
        /* no storage: nothing to keep, the field stays as it is */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The terms for one list, newest first; empty on the server and in a browser that keeps nothing. */
export function useRecentTerms(list: string): readonly string[] {
    return useSyncExternalStore(
        subscribe,
        () => readAll()[list] ?? EMPTY,
        () => EMPTY,
    );
}
