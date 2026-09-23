"use client";

import { useState } from "react";
import { BookOpen01, Folder, HomeLine, Rows01, SearchLg } from "@untitledui/icons";
import Link from "next/link";
import { useCommandSearch } from "@/components/app/command-search";
import { useRouteTarget, useStartRoute } from "@/components/app/route-pending";
import { Button } from "@/components/base/buttons/button";
import { useListMemory, withListQuery } from "@/hooks/use-list-memory";
import { cx } from "@/utils/cx";

const tabs = [
    { label: "Home", href: "/dashboard", icon: HomeLine, match: (p: string) => p === "/dashboard" },
    { label: "Browse", href: "/sets", icon: BookOpen01, match: (p: string) => p.startsWith("/sets") },
    // Collection: the cards you own and the wishlist, the two halves of one switch (collection-switch.tsx).
    {
        label: "Collection",
        href: "/dashboard/cards",
        icon: Rows01,
        match: (p: string) => ["/dashboard/cards", "/dashboard/wishlist"].some((h) => p.startsWith(h)),
    },
    {
        label: "Binders",
        href: "/dashboard/collections",
        icon: Folder,
        match: (p: string) => ["/dashboard/collections", "/dashboard/favorites"].some((h) => p.startsWith(h)),
    },
];

// Labels a size under the body scale, as a native tab bar writes them.
const tabClass = "pressable relative flex flex-1 flex-col items-center gap-1 rounded-full py-1.5 text-3xs font-medium";

// Bottom tab bar for mobile: four of the sidebar's pages in the sidebar's order: Home, Browse, the
// Collection (the cards you own, with the wishlist one tap in on its switch), and Binders (Favorites, the Pokédex and
// the binders you made, one level down). You is the avatar in Home's bar. Browse had no tab while the search at the top of Home
// listed every set; that search opens the palette now, as it does everywhere else, so Browse has
// its tab (Bart's call, 2026-09-11). Search is not a tab: it opens the palette, so it stands beside
// the bar as a round primary button, 4 px from it (Bart, 2026-09-18), on every page, where the bar at the top of Home was the only
// way in on a phone (Bart's call, 2026-09-18). The row's side inset matches the content's padding,
// so bar and page share an edge.
export function MobileTabBar() {
    // Where the app is going, or where it is: the pill moves on the tap, not when the page lands,
    // because the page you tapped from stays on screen until the next one is ready (route-pending.tsx).
    const pathname = useRouteTarget();
    const start = useStartRoute();
    // A tab opens its list as you left it: the filters and the sort, never the search (use-list-memory.ts).
    const memory = useListMemory();
    // A page outside the four (Settings, You) has no pill.
    const activeIndex = tabs.findIndex((tab) => tab.match(pathname));
    // The tab a finger or the focus is on: the one link asked for in full.
    const [intent, setIntent] = useState<string | null>(null);
    const { open } = useCommandSearch();

    return (
        <>
            {/* The ground under the bar: the page fades into it, and Safari's bottom bar reads it as solid. It, the bar and
                Search are each their own view transition layer, or a page change paints the page over them (globals.css).
                The bar's name sits on the nav itself: a name is a backdrop root, so on a wrapper it cut the glass off from
                the page behind it and Chrome drew the bar unblurred. */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-32 fade-to-page view-transition-tab-bar-ground lg:hidden" />
            {/* 12 px between the bar and Search: at 4 the two read as one shape (Bart, 2026-09-19). */}
            <div className="fixed inset-x-4 bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] z-40 flex items-stretch gap-3 sm:inset-x-6 lg:hidden">
                <nav
                    aria-label="Primary"
                    // The same hairline ring as an input, and the lift without the scale's own rim, so it is one line.
                    className="relative flex min-w-0 flex-1 items-stretch justify-around rounded-full glass p-1 shadow-lift-lg ring-1 ring-primary ring-inset view-transition-tab-bar"
                >
                    {/* The active tab's pill: one element behind the four, a quarter wide, slid to the tab's slot
                    on a tap so the change reads as a move and not a jump. Transform only; 200 ms on the
                    on-screen curve; under reduced motion it changes place without moving. */}
                    <div
                        aria-hidden="true"
                        className={cx(
                            "pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-full bg-alpha-black/8 transition-transform duration-(--duration-base) ease-move motion-reduce:transition-none",
                            activeIndex < 0 && "hidden",
                        )}
                        style={{ transform: `translateX(${Math.max(0, activeIndex) * 100}%)` }}
                    />
                    {tabs.map((tab) => {
                        const active = tab.match(pathname);
                        const Icon = tab.icon;
                        const href = withListQuery(tab.href, memory);
                        return (
                            <Link
                                key={tab.href}
                                href={href}
                                // The whole page, fetched the moment a finger lands on the tab, not when the bar
                                // mounts. On mount it was five full server renders (Home, Browse, the wishlist,
                                // the collection, Binders) on every hard load, and again after every write,
                                // because a refresh empties the router's prefetches and the bar asks for all
                                // five anew. The press lands a moment before the tap, so the read starts there and
                                // the tap joins it; the reads behind each tab are kept per person (user-cache.ts),
                                // which keeps that read short. Focus does the same for a keyboard.
                                prefetch={intent === tab.href ? true : null}
                                onPointerDown={() => setIntent(tab.href)}
                                onFocus={() => setIntent(tab.href)}
                                // Says where the bar is going the moment it is tapped, so the pill moves at once.
                                onNavigate={() => start(href)}
                                aria-current={active ? "page" : undefined}
                                className={cx(tabClass, active ? "text-primary" : "text-tertiary")}
                            >
                                <Icon className={cx("size-5", active ? "text-fg-primary" : "text-fg-quaternary")} />
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
                {/* A circle the bar's height: 58 px, the tab's icon, label and padding inside the bar's 4 px. */}
                <Button
                    iconLeading={SearchLg}
                    size="lg"
                    aria-label="Search"
                    onClick={open}
                    className="size-14.5 shrink-0 shadow-lift-lg view-transition-tab-search"
                />
            </div>
        </>
    );
}
