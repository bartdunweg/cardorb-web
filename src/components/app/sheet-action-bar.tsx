"use client";

import type { ReactNode } from "react";

// The bar at the bottom of a phone's sheet that holds what you opened it to do — for a card
// nobody holds, the two ways to take it. On a phone the sheet is the whole screen and those
// buttons used to sit at the end of the content, under every detail, so the person scrolled past
// all of it to reach them; an item sheet on iOS (Keeta, Starbucks, Shopee, Vivino) pins the
// primary action to the bottom instead, where the thumb already is. From `sm` up the sheet is a
// panel beside the page and the buttons stay in the flow; this bar is not drawn there.
//
// Sticky on the sheet's scroll, as the top bar is, and for the same reason a direct child of the
// scroll box: a sticky element stays only while its parent is in view. It keeps its height in the
// flow, so the last detail comes to rest above it at the end of the scroll and is never hidden
// under it. Its ground is the page's, opaque, with the page's own fade running out above it —
// the treatment the tab bar has on a page — so a row passing under it is a light and not a shape.
// The bottom padding clears the home indicator; the scroll box gives up its own so the bar is not
// held off the edge by the same inset twice. `mt-auto` because sticky only pulls an element back
// into view, it never pushes one down: a card with little to say ends above the fold, and the
// bar would sit at the end of the words rather than at the bottom of the screen.
export function SheetActionBar({ children }: { children: ReactNode }) {
    return (
        <div className="sticky bottom-0 z-20 mt-auto w-full flex-none">
            <div aria-hidden="true" className="pointer-events-none h-6 fade-to-page" />
            <div className="bg-page pb-safe">
                <div className="flex flex-col gap-2 px-4 pt-1 pb-3">{children}</div>
            </div>
        </div>
    );
}
