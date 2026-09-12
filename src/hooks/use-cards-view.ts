"use client";

import { useSyncExternalStore } from "react";
import { CARDS_SIZE_COOKIE, CARDS_VIEW_COOKIE, type CardsSize, type CardsViewMode } from "@/lib/cards-view";

/**
 * The View menu's layout and size, as this tab last chose them.
 *
 * The cookie alone was not enough. The router keeps a page it has shown (and the tab bar's
 * prefetched ones) for a minute (`staleTimes` in next.config.mjs), and that page was drawn with
 * the cookie as it was then. Large on the collection, a tap to the wishlist, and the wishlist
 * came back Medium; back to the collection, Medium there too. Each list held the choice in its
 * own `useState`, seeded from a prop the cached page still carried.
 *
 * So the choice lives here, above every list, and the prop is only what a list starts from
 * before anything was chosen in this tab: on a hard load the server has read the cookie and the
 * two agree. The cookie is still written, for the next hard load's first paint.
 */
const ONE_YEAR = 60 * 60 * 24 * 365;

let chosen: { view: CardsViewMode | null; size: CardsSize | null } = { view: null, size: null };
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// The whole site, not only /dashboard: the public profile shares the size.
const remember = (name: string, value: string) => {
    document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
};

const choose = (patch: Partial<typeof chosen>) => {
    chosen = { ...chosen, ...patch };
    for (const listener of listeners) listener();
};

export const setCardsView = (view: CardsViewMode) => {
    remember(CARDS_VIEW_COOKIE, view);
    choose({ view });
};

export const setCardsSize = (size: CardsSize) => {
    remember(CARDS_SIZE_COOKIE, size);
    choose({ size });
};

/** Nothing chosen on the server: it renders what the cookie says, and hydration agrees. */
const NOTHING = { view: null, size: null };

export function useCardsView(initialView: CardsViewMode, initialSize: CardsSize) {
    const current = useSyncExternalStore(
        subscribe,
        () => chosen,
        () => NOTHING,
    );
    return { view: current.view ?? initialView, size: current.size ?? initialSize };
}

/** For tests: forget what this module was told. */
export const resetCardsView = () => choose({ view: null, size: null });
