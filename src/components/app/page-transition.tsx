"use client";

import { type ReactNode, ViewTransition } from "react";
import { usePathname } from "next/navigation";

/**
 * Ours: how one page gives way to the next, with the browser's view transitions through React's
 * `<ViewTransition>` (Bart, 2026-09-18: switching between tabs and pages was a hard cut).
 *
 * Keyed by the address, so each page is an exit and an enter of one named pair: the content alone
 * moves, while the tab bar, the sidebar and the frame, outside it, stand still (globals.css turns the
 * root's own crossfade off). What it does depends on how it was reached:
 *
 * - a tab, the Collection | Wishlist switch, the browser's Back: a crossfade, 150 ms. Same place, other
 *   content, tapped tens of times a day, so nothing moves.
 * - a link one level in (`nav-forward`: a binder, a set): the page comes 24 px from the right.
 * - the page's own Back (`nav-back`): the same, mirrored.
 *
 * The old page stays on screen until the new one is ready (route-pending.tsx), so the change runs
 * between two finished pages, never into an outline.
 */
export function PageTransition({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    return (
        <ViewTransition key={pathname} name="page" share={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }} default="none">
            {children}
        </ViewTransition>
    );
}
