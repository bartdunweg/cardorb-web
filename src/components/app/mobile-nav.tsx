"use client";

import { BookOpen01, Folder, Heart, HomeLine } from "@untitledui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/utils/cx";

const tabs = [
    { label: "Home", href: "/dashboard", icon: HomeLine, match: (p: string) => p === "/dashboard" },
    { label: "Browse", href: "/dashboard/sets", icon: BookOpen01, match: (p: string) => p.startsWith("/dashboard/sets") },
    {
        label: "Folders",
        href: "/dashboard/collections",
        icon: Folder,
        match: (p: string) => ["/dashboard/collections", "/dashboard/cards", "/dashboard/favorites", "/dashboard/pokedex"].some((h) => p.startsWith(h)),
    },
    { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart, match: (p: string) => p.startsWith("/dashboard/wishlist") },
];

// 11 px labels: a size under the body scale, as a native tab bar writes them, so five fit with room.
const tabClass = "pressable flex flex-1 flex-col items-center gap-1 rounded-full py-1.5 text-[11px]/3.5 font-medium transition-colors duration-150";

// Bottom tab bar for mobile: Home, Browse (every set), the folders (All cards, Favorites and the
// Pokédex among them, one level down) and the wishlist. You is the avatar at the top of Home and
// Browse, and search lives beside it. The bar's side inset matches the content's padding, so bar
// and page share an edge.
export function MobileTabBar() {
    const pathname = usePathname();

    return (
        <nav
            aria-label="Primary"
            // The same hairline ring as an input, so the bar's edge matches the search pill above it, and the
            // lift without the scale's own rim, so it is one line.
            className="fixed inset-x-4 bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] z-40 flex items-stretch justify-around gap-1 rounded-full glass p-1 shadow-lift-lg ring-1 ring-primary ring-inset sm:inset-x-6 lg:hidden"
        >
            {tabs.map((tab) => {
                const active = tab.match(pathname);
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={active ? "page" : undefined}
                        className={cx(tabClass, active ? "bg-alpha-black/8 text-primary" : "text-tertiary")}
                    >
                        <Icon className={cx("size-5", active ? "text-fg-primary" : "text-fg-quaternary")} />
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
