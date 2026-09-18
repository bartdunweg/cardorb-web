"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a phone's search field is out, per page. The button that opens it is in the page's bar
 * (`BarSearchButton`) and the field in the list's row (`RowSearch`), two trees apart, so the state
 * lives above both, keyed by the page's path: another page opens with its field put away.
 */
type State = { page: string | null; asked: number };

let state: State = { page: null, asked: 0 };
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const set = (next: State) => {
    state = next;
    for (const listener of listeners) listener();
};

/** Out, and the caret in it (`asked` counts the presses, so a second press on an open field focuses it again). */
export const openRowSearch = (page: string) => set({ page, asked: state.asked + 1 });

export const closeRowSearch = () => set({ page: null, asked: state.asked });

const CLOSED: State = { page: null, asked: 0 };

export function useRowSearch(page: string) {
    const now = useSyncExternalStore(
        subscribe,
        () => state,
        () => CLOSED,
    );
    return { open: now.page === page, asked: now.asked };
}
