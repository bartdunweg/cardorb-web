"use client";

import { Folder, HomeLine, Rows01 } from "@untitledui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/base/avatar/avatar";
import { cx } from "@/utils/cx";

type Account = { name: string; email: string; avatarUrl: string | null };

const tabs = [
    { label: "Home", href: "/dashboard", icon: HomeLine, match: (p: string) => p === "/dashboard" },
    {
        label: "Collection",
        href: "/dashboard/cards",
        icon: Rows01,
        match: (p: string) => ["/dashboard/cards", "/dashboard/sets", "/dashboard/pokedex", "/dashboard/favorites"].some((h) => p.startsWith(h)),
    },
    { label: "Folders", href: "/dashboard/collections", icon: Folder, match: (p: string) => p.startsWith("/dashboard/collections") },
];

const tabClass = "pressable flex flex-1 flex-col items-center gap-1 rounded-full py-1 text-xs/4 font-medium transition-colors duration-150";

// Bottom tab bar for mobile: Home, the collection (its four views switch at the top of the page),
// the folders, and You. Search lives at the top of Home; the wishlist is a tile on Folders. Its side
// inset matches the content's padding, so bar and page share an edge.
export function MobileTabBar({ account }: { account: Account }) {
    const pathname = usePathname();
    const youActive = pathname.startsWith("/dashboard/you");

    return (
        <nav
            aria-label="Primary"
            className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex items-stretch justify-around gap-1 rounded-full glass p-0.5 shadow-lg sm:inset-x-6 lg:hidden"
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
                <Avatar size="xs" src={account.avatarUrl ?? undefined} alt="" className="size-5" />
                You
            </Link>
        </nav>
    );
}
