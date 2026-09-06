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
        for (const href of hrefs) router.prefetch(href);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
}
