"use client";

import { useEffect, useState } from "react";

// What has already been on screen in this tab, by name. Module state, so it lasts as long as the
// page's script does (a tab) and a reload starts over.
const shown = new Set<string>();

/**
 * Whether `arrive` should play on what is drawn under `key`: true the first time in this tab, false
 * after. Folding or unfolding the sidebar draws its slots anew (the open list and the rail are two
 * trees), and `arrive` then played again on things that had not gone anywhere; they arrive once,
 * when the read first lands, and stand still after.
 */
export function useArriveOnce(key: string): boolean {
    const [first] = useState(() => !shown.has(key));
    useEffect(() => {
        shown.add(key);
    }, [key]);
    return first;
}

/** For tests: forget what has been shown. */
export function resetArriveOnce() {
    shown.clear();
}
