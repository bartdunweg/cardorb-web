"use client";

import { type CSSProperties, type ReactNode, type RefObject, useEffect, useRef } from "react";

// The bar's height: a 44 px button, the size of a page bar's, between twelve points above and below it.
const BAR_HEIGHT = 68;

// The bar at the top of a sheet whose head is a picture: Close at the left, the actions at the
// right, and the name between them once the big title has slid under it. The sheet itself
// scrolls, so the bar is sticky on it, and it takes no height: the art starts at the top and the
// buttons sit in it, as before. Over the art it has no ground; as the title passes under it the
// page's colour comes in, fading down into the content the way the tab bar's fade comes up, and
// the name with it, so the name stays readable wherever the page is. Both follow the scroll
// position and nothing else: no animation, so nothing to reduce.
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
        <div ref={ref} className="sticky top-0 z-20 h-0 w-full" style={{ "--bar": 0 } as CSSProperties}>
            {/* Three columns, the outer two equal, so the name is centred on the bar and not between
                one button and two. */}
            <div className="relative grid h-17 grid-cols-[1fr_auto_1fr] items-center px-3">
                {/* Past the bar, not only behind it: the ground is 68px of bar plus a tail below it, so the
                    fade has room to finish instead of ending at the bar's own edge. */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -bottom-8 fade-from-page" style={{ opacity: "var(--bar)" }} />
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
