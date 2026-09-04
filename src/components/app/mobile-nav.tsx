"use client";

import { Folder, HomeLine, Rows01, SearchLg } from "@untitledui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/base/avatar/avatar";
import { cx } from "@/utils/cx";

type Account = { name: string; email: string; avatarUrl: string | null };

const tabs = [
    { label: "Home", href: "/dashboard", icon: HomeLine, match: (p: string) => p === "/dashboard" },
    { label: "Cards", href: "/dashboard/cards", icon: Rows01, match: (p: string) => p.startsWith("/dashboard/cards") },
    { label: "Collections", href: "/dashboard/collections", icon: Folder, match: (p: string) => p.startsWith("/dashboard/collections") },
];

// Bottom tab bar for mobile: primary navigation with the add action as the centre button.
export function MobileTabBar({ account }: { account: Account }) {
    const pathname = usePathname();

    const renderTab = (tab: (typeof tabs)[number]) => {
        const active = tab.match(pathname);
        const Icon = tab.icon;
        return (
            <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-full py-1 text-xxxs font-medium transition",
                    active ? "bg-secondary text-primary" : "text-tertiary",
                )}
            >
                <Icon className={cx("size-4", active ? "text-fg-brand-primary" : "text-fg-quaternary")} />
                {tab.label}
            </Link>
        );
    };

    return (
        <nav
            aria-label="Primary"
            className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex items-stretch justify-around gap-1 rounded-full border border-secondary bg-primary p-0.5 shadow-lg lg:hidden"
        >
            {renderTab(tabs[0])}
            {renderTab(tabs[1])}

            <Link
                href="/dashboard/search"
                aria-current={pathname.startsWith("/dashboard/search") ? "page" : undefined}
                className={cx(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-full py-1 text-xxxs font-medium transition",
                    pathname.startsWith("/dashboard/search") ? "bg-secondary text-primary" : "text-tertiary",
                )}
            >
                <SearchLg className={cx("size-4", pathname.startsWith("/dashboard/search") ? "text-fg-brand-primary" : "text-fg-quaternary")} />
                Search
            </Link>

            {renderTab(tabs[2])}

            <Link
                href="/dashboard/settings"
                aria-current={pathname.startsWith("/dashboard/settings") ? "page" : undefined}
                className={cx(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-full py-1 text-xxxs font-medium transition",
                    pathname.startsWith("/dashboard/settings") ? "bg-secondary text-primary" : "text-tertiary",
                )}
            >
                <Avatar size="xs" src={account.avatarUrl ?? undefined} alt={account.name} className="size-4" />
                Profile
            </Link>
        </nav>
    );
}
