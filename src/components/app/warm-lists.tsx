"use client";

import { useEffect } from "react";
import { warmList } from "@/app/(app)/dashboard/list-actions";

/**
 * The lists the navigation leads to, read while you are reading the page you are on.
 *
 * A tab switch is its list at the API and almost nothing else: 250 to 450 ms for `GET /cards`
 * against 20 to 70 ms for everything the app itself does. That read cannot be made faster from
 * here, so it is made earlier: once, when the frame mounts, each of the three lists is read into
 * the cache the pages read from, and the tap that follows is a cache hit.
 *
 * When the browser is idle, and one after the other: the page you are on is still fetching its
 * own list, and three more reads at the same moment would be three more things in front of it.
 * Once per load, not per navigation: this sits in the app's layout, which survives every
 * navigation inside it.
 */

const LISTS = ["collection", "wishlist", "favorites"] as const;

export function WarmLists() {
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            for (const list of LISTS) {
                if (cancelled) return;
                await warmList({ list });
            }
        };
        // Idle, so nothing of the page you are on waits behind this. Without `requestIdleCallback`
        // (Safari before 18) a second and a half is past every page's own first paint.
        const idle = window.requestIdleCallback?.(() => void run(), { timeout: 3000 });
        const timer = idle === undefined ? setTimeout(() => void run(), 1500) : undefined;
        return () => {
            cancelled = true;
            if (idle !== undefined) window.cancelIdleCallback?.(idle);
            if (timer !== undefined) clearTimeout(timer);
        };
    }, []);
    return null;
}
