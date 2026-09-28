"use client";

import { type ReactNode, ViewTransition } from "react";
import { useSelectedLayoutSegments } from "next/navigation";

/**
 * Ours: how one page gives way to the next, with the browser's view transitions through React's
 * `<ViewTransition>` (Bart, 2026-09-18: switching between tabs and pages was a hard cut).
 *
 * Keyed by the page's own segments, so each page is an exit and an enter of one named pair: the content alone
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
 *
 * The segments rather than the address: sign in and sign up open over the page (auth-modal.tsx), and
 * the address becomes /login while the page stays. Keyed by the address, the page behind was thrown
 * away and built again under the modal, closing a card's sheet and leaving focus nowhere to return to.
 */
export function PageTransition({ children }: { children: ReactNode }) {
    const page = useSelectedLayoutSegments().join("/");
    return (
        <ViewTransition key={page} name="page" share={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "page-fade" }} default="none">
            {children}
        </ViewTransition>
    );
}
