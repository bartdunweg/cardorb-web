"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { remember, useListMemory } from "@/hooks/use-list-memory";
import { CARDS_GROUP_COOKIE, CARDS_SIZE_COOKIE, CARDS_VIEW_COOKIE, type CardsGroup, type CardsSize, type CardsViewMode } from "@/lib/cards-view";
import { memoryKey } from "@/lib/list-memory";

/**
 * The View menu's layout, size and set headings, per page.
 *
 * A choice is the page's own (`list-memory.ts`): the collection as a table, a binder as large
 * tiles, and each keeps it. A page never chosen on takes the last choice made anywhere, which is
 * what the three plain cookies still hold, so a new binder opens the way the others were left
 * and not at the factory setting.
 *
 * Both live above every list rather than in a `useState` per list, because the router keeps a
 * page it has shown (and the tab bar's prefetched ones) for a minute, drawn with the cookies as
 * they were then: large on the collection, a tap to the wishlist, and the wishlist came back
 * Medium. The prop a list is given is only what it starts from before anything was chosen in
 * this tab; on a hard load the server has read the cookies and the two agree.
 */
const ONE_YEAR = 60 * 60 * 24 * 365;

type Choice = { view: CardsViewMode | null; size: CardsSize | null; group: CardsGroup | null };

let chosen: Choice = { view: null, size: null, group: null };
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

// The whole site, not only /dashboard: the public profile shares the size.
const rememberEverywhere = (name: string, value: string) => {
    document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
};

const choose = (patch: Partial<Choice>) => {
    chosen = { ...chosen, ...patch };
    for (const listener of listeners) listener();
};

export const setCardsView = (key: string, view: CardsViewMode) => {
    rememberEverywhere(CARDS_VIEW_COOKIE, view);
    remember(key, { view });
    choose({ view });
};

export const setCardsSize = (key: string, size: CardsSize) => {
    rememberEverywhere(CARDS_SIZE_COOKIE, size);
    remember(key, { size });
    choose({ size });
};

export const setCardsGroup = (key: string, group: CardsGroup) => {
    rememberEverywhere(CARDS_GROUP_COOKIE, group);
    remember(key, { group });
    choose({ group });
};

/** Nothing chosen on the server: it renders what the cookies say, and hydration agrees. */
const NOTHING: Choice = { view: null, size: null, group: null };

export function useCardsView(initialView: CardsViewMode, initialSize: CardsSize, initialGroup: CardsGroup = "sets") {
    const page = useListMemory()[memoryKey(usePathname())];
    const anywhere = useSyncExternalStore(
        subscribe,
        () => chosen,
        () => NOTHING,
    );
    return {
        view: page?.view ?? anywhere.view ?? initialView,
        size: page?.size ?? anywhere.size ?? initialSize,
        group: page?.group ?? anywhere.group ?? initialGroup,
    };
}

/** For tests: forget what this module was told. */
export const resetCardsView = () => choose({ view: null, size: null, group: null });
