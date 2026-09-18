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

/*
 * Where the field goes in the bar. The bar hands its slot in as it mounts (a callback ref) rather
 * than the field looking for it: during a client navigation the page being left is still in the
 * document, and a lookup found its slot, which was gone a moment later with the term in it.
 */
let slot: HTMLElement | null = null;
const slotListeners = new Set<() => void>();

const subscribeSlot = (listener: () => void) => {
    slotListeners.add(listener);
    return () => slotListeners.delete(listener);
};

/** The bar's slot, as a ref: set as it mounts, and cleared only if it is still the one held. */
export const barSearchSlot = (el: HTMLElement | null) => {
    if (el) slot = el;
    else if (slot && !slot.isConnected) slot = null;
    else return;
    for (const listener of slotListeners) listener();
};

export function useBarSearchSlot() {
    return useSyncExternalStore(
        subscribeSlot,
        () => slot,
        () => null,
    );
}
