"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The pages a person will tap next, fetched while they read this one, so the tap draws the page
// at once rather than its outline. The sidebar's links are react-aria links, which do not
// prefetch on their own; the tab bar's are next/link and prefetch themselves.
export function PrefetchRoutes({ hrefs }: { hrefs: string[] }) {
    const router = useRouter();
    // Once, when the shell mounts: the router object is new on every navigation, and prefetching
    // seven routes again on each one had every navigation waiting on prefetches in flight.
    useEffect(() => {
        // Only where the sidebar is. This is rendered beside the sidebar, not inside its
        // `hidden lg:flex` wrapper, so a phone — which never sees these links, and whose tab bar's
        // next/link items prefetch their own — was fetching every one of them on a hard load, each
        // a dynamic route that re-runs the session check. 64rem is Tailwind's lg.
        if (!window.matchMedia("(min-width: 64rem)").matches) return;
        for (const href of hrefs) router.prefetch(href);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
}
