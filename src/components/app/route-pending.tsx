"use client";

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Where the app is on its way to, while the page you can see is still standing.
 *
 * Every page under the dashboard reads the API, so a tap cannot draw the next page at once. The
 * app used to answer with the page's own `loading.tsx`: the page you were on vanished the moment
 * you tapped and you looked at grey blocks until the answer came, which read as the app being
 * slower than it is. Now the page stands until the next one is ready, and the navigation answers
 * the tap instead: the tab bar's pill moves to the tab you tapped and the sidebar's row lights up
 * on the page you are going to, not on the one you are on, and a line at the top of the window
 * says the app is fetching (route-progress.tsx).
 *
 * What a link has to do for that: say where it is going the moment it is followed. A `next/link`
 * has `onNavigate`; every react-aria link goes through the router in providers/router-provider.tsx,
 * which says it for all of them at once.
 */

type Pending = { path: string };

const RoutePendingContext = createContext<{ target: string | null; going: boolean; start: (href: string) => void }>({
    target: null,
    going: false,
    start: () => {},
});

export function RoutePendingProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [pending, setPending] = useState<Pending | null>(null);

    // Arrived when the address is the page we set out for. Read from the address rather than
    // cleared in an effect: the router changes it the moment the new page commits, which is
    // exactly when the line should stop and the tab should stop being a promise.
    const going = pending !== null && pending.path !== pathname;

    // A navigation that never commits (a push that failed, an address written another way than
    // the link wrote it) must not leave the line running for the rest of the session.
    useEffect(() => {
        if (!going) return;
        const timer = setTimeout(() => setPending(null), 10_000);
        return () => clearTimeout(timer);
    }, [going]);

    const start = useCallback(
        (href: string) => {
            // The path, not the query: a page that only narrows its own list (a filter, a sort, a
            // page number) stays where it is and answers in its own row, so it starts nothing here.
            const path = href.split(/[?#]/)[0];
            setPending(path === pathname ? null : { path });
        },
        [pathname],
    );

    const value = useMemo(() => ({ target: going ? (pending?.path ?? null) : null, going, start }), [going, pending, start]);

    return <RoutePendingContext.Provider value={value}>{children}</RoutePendingContext.Provider>;
}

/** The page the navigation draws as current: where the tap is going, or, between taps, where we are. */
export function useRouteTarget(): string {
    const pathname = usePathname();
    return useContext(RoutePendingContext).target ?? pathname;
}

/** Whether a page is being fetched, for the line at the top of the window. */
export function useRouteGoing(): boolean {
    return useContext(RoutePendingContext).going;
}

/** What a link calls when it is followed: `onNavigate` on a `next/link`, `navigate` on the react-aria router. */
export function useStartRoute(): (href: string) => void {
    return useContext(RoutePendingContext).start;
}
