"use client";

import { type CSSProperties, type ReactNode, type RefObject, useEffect, useRef } from "react";

// The bar's height: a 44 px button, the size of a page bar's, between twelve points above and below it.
const BAR_HEIGHT = 68;
// How far the sheet scrolls before its ground is fully in: a native bar's material is in within
// the first few points, so the content never sits under a bare bar.
const GROUND_SCROLL = 24;

// The bar at the top of a sheet whose head is a picture: Close at the left, the actions at the
// right, and the name between them once the big title has slid under it. The sheet itself
// scrolls, so the bar is sticky on it, and it takes no height: the art starts at the top and the
// buttons sit in it, as before. At the top it has no ground, as a native bar has none at its
// scroll edge; the moment the sheet scrolls, the same glass as the tab bar comes in under it, blur
// running out under the bar's bottom, so whatever passes under the bar is a light and not a
// shape, and the name is readable on it wherever the page is. The name itself comes in as the big title slides under.
// Both follow the scroll position and nothing else: no animation, so nothing to reduce.
//
// The sticky box must be a direct child of the sheet's scroll box, not of its header: a sticky
// element stays only while its parent is in view, and the header is what scrolls away.
export function SheetBar({
    title,
    titleRef,
    left,
    right,
}: {
    title: string;
    /** The big title in the header below: the bar's name and ground are in as far as it has passed. */
    titleRef: RefObject<HTMLElement | null>;
    left: ReactNode;
    right?: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const bar = ref.current;
        const root = bar?.parentElement;
        if (!bar || !root) return;
        const update = () => {
            bar.style.setProperty("--ground", String(Math.min(1, root.scrollTop / GROUND_SCROLL)));
            const heading = titleRef.current;
            if (!heading) {
                bar.style.setProperty("--bar", "0");
                return;
            }
            // How far the title's top is under the sheet's top edge; 0 to 1 as it slides its own
            // height under the bar's bottom.
            const top = heading.getBoundingClientRect().top - root.getBoundingClientRect().top;
            const shown = (BAR_HEIGHT - top) / Math.max(1, heading.offsetHeight);
            bar.style.setProperty("--bar", String(Math.min(1, Math.max(0, shown))));
        };
        update();
        root.addEventListener("scroll", update, { passive: true });
        return () => root.removeEventListener("scroll", update);
        // Measured again for another card: its title is elsewhere, and the sheet may not have scrolled.
    }, [titleRef, title]);

    return (
        <div ref={ref} className="sticky top-0 z-20 h-0 w-full" style={{ "--bar": 0, "--ground": 0 } as CSSProperties}>
            {/* Three columns, the outer two equal, so the name is centred on the bar and not between
                one button and two. */}
            {/* Pushed clear of the status bar. The sheet is the whole screen now, so its art runs
                under the notch on purpose — the buttons must not. Nothing on a desktop, where the
                inset is zero. */}
            <div className="relative grid h-17 grid-cols-[1fr_auto_1fr] items-center px-3" style={{ marginTop: "env(safe-area-inset-top)" }}>
                {/* The ground: the tab bar's glass, running out under the bar's bottom rather than
                    ending on a line — the same ground a page's bar stands on. */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -bottom-7 glass-fade"
                    // Up past the bar's own top, so the ground covers the status bar too rather
                    // than leaving the art bright behind the clock once the sheet has scrolled.
                    style={{ opacity: "var(--ground)", top: "calc(-1 * env(safe-area-inset-top))" }}
                />
                {/* A gap, because these are glass: three translucent circles touching read as one
                    smear rather than three buttons, and each carries its own faint ring. */}
                <div className="relative flex items-center gap-3 justify-self-start">{left}</div>
                {/* Decoration: the heading below is the title, this is it shown again where it can be read. */}
                <p aria-hidden="true" className="relative min-w-0 truncate text-center text-md font-semibold text-primary" style={{ opacity: "var(--bar)" }}>
                    {title}
                </p>
                <div className="relative flex items-center gap-3 justify-self-end">{right}</div>
            </div>
        </div>
    );
}
