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
/*
 * Per page, by its path: Next keeps a page it has left mounted and hidden, for Back, and a field on
 * that page held on to whichever bar had come in last and drew itself into it, beside the new page's
 * own field (Browse's empty field in a set's bar, 2026-09-19). A field only goes into its own page's bar.
 */
const slots = new Map<string, HTMLElement>();
const slotListeners = new Set<() => void>();
/** One ref per path, kept, so React does not detach and attach the slot on every render. */
const slotRefs = new Map<string, (el: HTMLElement | null) => (() => void) | undefined>();

const subscribeSlot = (listener: () => void) => {
    slotListeners.add(listener);
    return () => slotListeners.delete(listener);
};

const notifySlot = () => {
    for (const listener of slotListeners) listener();
};

/** The bar's slot for the page at `page`, as a ref: set as it mounts, let go as it unmounts if still the one held. */
export function barSearchSlot(page: string) {
    let ref = slotRefs.get(page);
    if (!ref) {
        ref = (el: HTMLElement | null) => {
            if (!el) return;
            slots.set(page, el);
            notifySlot();
            return () => {
                if (slots.get(page) !== el) return;
                slots.delete(page);
                notifySlot();
            };
        };
        slotRefs.set(page, ref);
    }
    return ref;
}

/** The bar of the page at `page`, once it is drawn. */
export function useBarSearchSlot(page: string) {
    return useSyncExternalStore(
        subscribeSlot,
        () => slots.get(page) ?? null,
        () => null,
    );
}
