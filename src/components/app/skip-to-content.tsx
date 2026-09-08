"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The way past the sidebar, for anyone moving by keyboard.
 *
 * Two halves of one problem. The link is the first thing in the tab order and invisible until it
 * has focus; without it every page starts with the search trigger, four nav links, Favorites, the
 * Pokédex, one link per binder, "New binder" and the account menu — a dozen presses before the
 * page you came for. That is WCAG 2.4.1, and it is Level A.
 *
 * The effect is the other half: following a link in the sidebar leaves focus on that link, so the
 * next Tab carries on through the rest of the sidebar rather than into the page that just opened.
 * Focus goes to the content instead, which is what a page load would have done.
 *
 * On the path only. A list page writes its search and filters into the query string, and moving
 * focus while somebody is typing into the search box would take the cursor out of it.
 */

export const MAIN_ID = "main-content";

export function SkipToContent() {
    const pathname = usePathname();
    // The first render is a page load: the browser has already put focus where it belongs, and
    // taking it would be the app talking over the reader before they have read anything.
    const landed = useRef(false);

    useEffect(() => {
        if (!landed.current) {
            landed.current = true;
            return;
        }
        document.getElementById(MAIN_ID)?.focus();
    }, [pathname]);

    return (
        <a
            href={`#${MAIN_ID}`}
            className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary shadow-lg ring-1 ring-secondary outline-focus-ring focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:outline-2 focus:outline-offset-2"
        >
            Skip to content
        </a>
    );
}
