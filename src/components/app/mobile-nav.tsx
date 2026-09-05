"use client";

import { Suspense, use } from "react";
import { BookOpen01, Folder, Heart, HomeLine } from "@untitledui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/base/avatar/avatar";
import { cx } from "@/utils/cx";

type Account = { name: string; email: string; avatarUrl: string | null };

const tabs = [
    { label: "Home", href: "/dashboard", icon: HomeLine, match: (p: string) => p === "/dashboard" },
    {
        label: "Folders",
        href: "/dashboard/collections",
        icon: Folder,
        match: (p: string) => ["/dashboard/collections", "/dashboard/cards", "/dashboard/favorites", "/dashboard/pokedex"].some((h) => p.startsWith(h)),
    },
    { label: "Browse", href: "/dashboard/sets", icon: BookOpen01, match: (p: string) => p.startsWith("/dashboard/sets") },
    { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart, match: (p: string) => p.startsWith("/dashboard/wishlist") },
];

// 11 px labels: a size under the body scale, as a native tab bar writes them, so five fit with room.
const tabClass = "pressable flex flex-1 flex-col items-center gap-1 rounded-full py-1.5 text-[11px]/3.5 font-medium transition-colors duration-150";

// Bottom tab bar for mobile: Home, the folders (All cards, Favorites and the Pokédex among them,
// one level down), Browse (every set), the wishlist, and You. Search lives at the top of Home. Its side
// inset matches the content's padding, so bar and page share an edge.
export function MobileTabBar({ account }: { account: Promise<Account> }) {
    const pathname = usePathname();
    const youActive = pathname.startsWith("/dashboard/you");

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
                        className={cx(tabClass, active ? "bg-secondary text-primary" : "text-tertiary")}
                    >
                        <Icon className={cx("size-5", active ? "text-fg-primary" : "text-fg-quaternary")} />
                        {tab.label}
                    </Link>
                );
            })}
            <Link
                href="/dashboard/you"
                aria-current={youActive ? "page" : undefined}
                className={cx(tabClass, youActive ? "bg-secondary text-primary" : "text-tertiary")}
            >
                {/* The avatar sits in the icon's 20 px, so the You tab is as tall as the other four. */}
                <Suspense fallback={<Avatar size="xs" alt="" className="size-5" />}>
                    <YouAvatar account={account} />
                </Suspense>
                You
            </Link>
        </nav>
    );
}

// The picture arrives with the profile read; until then the tab shows the avatar's own placeholder.
function YouAvatar({ account }: { account: Promise<Account> }) {
    return <Avatar size="xs" src={use(account).avatarUrl ?? undefined} alt="" className="size-5" />;
}
