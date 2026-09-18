"use client";

import { useEffect } from "react";
import { REPLAY_FUNCTION } from "@/lib/early-press";

/**
 * Tells the early-press script in the root layout's <head> (src/lib/early-press.ts) that React is
 * in, so the presses it held go to their buttons now. An effect runs only once the page it sits in
 * has committed, which is the moment a button's press handlers are there to be reached. A button
 * in a part the server is still streaming is not drawn yet, so it cannot have been pressed; one in
 * a part React has not hydrated yet is hydrated on the spot by React for the replayed click.
 *
 * It also marks the moment ("react-in" in the page's performance timeline), which is the page's
 * time to interactive as a press sees it.
 *
 * In a timeout rather than in the effect itself, so the presses land as events of their own and not
 * inside React's commit.
 */
export function EarlyPressReplay() {
    useEffect(() => {
        // When the page answers a press through React: its time to interactive, readable in the
        // Performance panel and by a PerformanceObserver.
        performance.mark("react-in");
        const replay = (window as unknown as Record<string, (() => void) | undefined>)[REPLAY_FUNCTION];
        const id = setTimeout(() => replay?.(), 0);
        return () => clearTimeout(id);
    }, []);
    return null;
}
