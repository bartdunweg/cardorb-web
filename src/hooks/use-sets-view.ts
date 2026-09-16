"use client";

import { useSyncExternalStore } from "react";
import { SETS_VIEW_COOKIE, type SetsViewMode } from "@/lib/sets-view";

/**
 * Browse's grid-or-list choice, shared by the View menu and the shelf under it.
 *
 * The cookie is still written, so the server draws the chosen layout on the next load. The switch
 * itself is here, in the browser: the shelf is drawn in the browser from data it already holds
 * (sets-shelf.tsx), and the same sets come as tiles or as rows, so asking the server again only
 * read the whole shelf a second time to redraw what was on screen. Kept above both rather than in a
 * `useState` for the reason the card lists keep theirs there (use-cards-view.ts): the router keeps a
 * page it has shown, drawn with the cookie as it was then.
 */
const ONE_YEAR = 60 * 60 * 24 * 365;

let chosen: SetsViewMode | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const setSetsView = (view: SetsViewMode) => {
    document.cookie = `${SETS_VIEW_COOKIE}=${view}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    chosen = view;
    for (const listener of listeners) listener();
};

/** Nothing chosen on the server: it renders what the cookie says, and hydration agrees. */
export function useSetsView(initial: SetsViewMode): SetsViewMode {
    const view = useSyncExternalStore(
        subscribe,
        () => chosen,
        () => null,
    );
    return view ?? initial;
}
