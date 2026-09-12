"use client";

import { useRouteGoing } from "@/components/app/route-pending";

/**
 * The line across the top of the window while the next page is being fetched.
 *
 * The page you tapped from stays on screen (route-pending.tsx), so something has to say that the
 * app is working. A hairline at the very top, over everything, is the smallest thing that does:
 * it does not move the page, and it is where a browser's own loading has always been.
 *
 * The line itself is decoration (`aria-hidden`); the word beside it is not. A visible status has
 * to be available to a screen reader too, and the page that is coming cannot say it: the page you
 * are on is still the one on screen. Next's own announcer reads the new title on arrival, so this
 * is the one word before it, politely, out of the way of whatever is being read.
 *
 * The track waits 150 ms before it fades in, in CSS rather than a timer: most navigations are
 * done inside that, and a line that flashes for one frame on every tap is noise.
 */
export function RouteProgress() {
    const going = useRouteGoing();
    return (
        <>
            {going ? (
                <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 route-progress-track overflow-hidden">
                    <div className="h-full route-progress w-2/5 rounded-full bg-brand-solid" />
                </div>
            ) : null}
            <output aria-live="polite" className="sr-only">
                {going ? "Loading the page" : ""}
            </output>
        </>
    );
}
