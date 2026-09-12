"use client";

import { BookOpen01, Folder, Heart, HomeLine, Rows01 } from "@untitledui/icons";
import Link from "next/link";
import { useRouteTarget, useStartRoute } from "@/components/app/route-pending";
import { cx } from "@/utils/cx";

const tabs = [
    { label: "Home", href: "/dashboard", icon: HomeLine, match: (p: string) => p === "/dashboard" },
    { label: "Browse", href: "/dashboard/sets", icon: BookOpen01, match: (p: string) => p.startsWith("/dashboard/sets") },
    { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart, match: (p: string) => p.startsWith("/dashboard/wishlist") },
    { label: "Collection", href: "/dashboard/cards", icon: Rows01, match: (p: string) => p.startsWith("/dashboard/cards") },
    {
        label: "Binders",
        href: "/dashboard/collections",
        icon: Folder,
        match: (p: string) => ["/dashboard/collections", "/dashboard/favorites", "/dashboard/pokedex"].some((h) => p.startsWith(h)),
    },
];

// Labels a size under the body scale, as a native tab bar writes them, so five fit with room.
const tabClass = "pressable relative flex flex-1 flex-col items-center gap-1 rounded-full py-1.5 text-2xs font-medium transition-colors duration-150";

// Bottom tab bar for mobile: the sidebar's five pages in the sidebar's order: Home, Browse, the
// wishlist, the collection, and Binders (Favorites, the Pokédex and the folders you made, one level
// down). You is the avatar in Home's bar. Browse had no tab while the search at the top of Home
// listed every set; that search opens the palette now, as it does everywhere else, so Browse has
// its tab (Bart's call, 2026-09-11). The bar's side inset matches the content's padding, so bar and
// page share an edge.
export function MobileTabBar() {
    // Where the app is going, or where it is: the pill moves on the tap, not when the page lands,
    // because the page you tapped from stays on screen until the next one is ready (route-pending.tsx).
    const pathname = useRouteTarget();
    const start = useStartRoute();
    // A page outside the five (Settings, You) has no pill.
    const activeIndex = tabs.findIndex((tab) => tab.match(pathname));

    return (
        <>
            {/* The ground under the bar: the page fades into it, and Safari's bottom bar reads it as solid. */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-32 fade-to-page lg:hidden" />
            <nav
                aria-label="Primary"
                // The same hairline ring as an input, so the bar's edge matches the search pill above it, and the
                // lift without the scale's own rim, so it is one line.
                className="fixed inset-x-4 bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] z-40 flex items-stretch justify-around rounded-full glass p-1 shadow-lift-lg ring-1 ring-primary ring-inset sm:inset-x-6 lg:hidden"
            >
                {/* The active tab's pill: one element behind the five, a fifth wide, slid to the tab's slot
                on a tap so the change reads as a move and not a jump. Transform only; 200 ms on the
                on-screen curve; under reduced motion it changes place without moving. */}
                <div
                    aria-hidden="true"
                    className={cx(
                        "pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/5)] rounded-full bg-alpha-black/8 transition-transform duration-200 ease-move motion-reduce:transition-none",
                        activeIndex < 0 && "hidden",
                    )}
                    style={{ transform: `translateX(${Math.max(0, activeIndex) * 100}%)` }}
                />
                {tabs.map((tab) => {
                    const active = tab.match(pathname);
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            // The whole page, fetched when the bar mounts, so a tap draws it at once rather than its outline.
                            prefetch={true}
                            // Says where the bar is going the moment it is tapped, so the pill moves at once.
                            onNavigate={() => start(tab.href)}
                            aria-current={active ? "page" : undefined}
                            className={cx(tabClass, active ? "text-primary" : "text-tertiary")}
                        >
                            <Icon className={cx("size-5", active ? "text-fg-primary" : "text-fg-quaternary")} />
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
