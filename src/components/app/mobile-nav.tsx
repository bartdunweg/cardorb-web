"use client";

import { Folder, Grid01, Heart, HomeLine, Rows01, SearchLg, Star01 } from "@untitledui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { AccountMenuItems } from "@/components/app/account-menu";
import { Avatar } from "@/components/base/avatar/avatar";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { cx } from "@/utils/cx";

type Account = { name: string; email: string; avatarUrl: string | null };

const tabs = [
    { label: "Home", href: "/dashboard", icon: HomeLine, match: (p: string) => p === "/dashboard" },
    { label: "Cards", href: "/dashboard/cards", icon: Rows01, match: (p: string) => p.startsWith("/dashboard/cards") },
    { label: "Search", href: "/dashboard/search", icon: SearchLg, match: (p: string) => p.startsWith("/dashboard/search") },
    { label: "Collections", href: "/dashboard/collections", icon: Folder, match: (p: string) => p.startsWith("/dashboard/collections") },
];

// What the sidebar has and the four tabs do not. The More menu carries these, then the account's
// own entries, so nothing reachable on desktop is out of reach on a phone.
const more = [
    { label: "Pokédex", href: "/dashboard/pokedex", icon: Grid01 },
    { label: "Favorites", href: "/dashboard/favorites", icon: Star01 },
    { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
];

const tabClass = "flex flex-1 flex-col items-center gap-1 rounded-full py-1 text-xs/4 font-medium transition";

// Bottom tab bar for mobile: four destinations and the account, You, in one pill. You opens what
// the sidebar has and the tabs do not, then the account's own entries, so a phone reaches all of it.
export function MobileTabBar({ account }: { account: Account }) {
    const pathname = usePathname();
    const youActive = [...more.map((m) => m.href), "/dashboard/settings"].some((href) => pathname.startsWith(href));

    return (
        <nav
            aria-label="Primary"
            className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex items-stretch justify-around gap-1 rounded-full border border-secondary bg-primary p-0.5 shadow-lg lg:hidden"
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
                        <Icon className={cx("size-5", active ? "text-fg-brand-primary" : "text-fg-quaternary")} />
                        {tab.label}
                    </Link>
                );
            })}
            <Dropdown.Root>
                <AriaButton
                    className={({ isFocusVisible }) =>
                        cx(
                            tabClass,
                            "cursor-pointer -outline-offset-2 outline-focus-ring",
                            youActive ? "bg-secondary text-primary" : "text-tertiary",
                            isFocusVisible && "outline-2",
                        )
                    }
                >
                    {/* The avatar sits in the icon's 20 px, so the You tab is as tall as the other four. */}
                    <Avatar size="xs" src={account.avatarUrl ?? undefined} alt="" className="size-5" />
                    You
                </AriaButton>
                <Dropdown.Popover placement="top end" offset={12}>
                    <Dropdown.Menu>
                        {more.map((item) => (
                            <Dropdown.Item key={item.href} icon={item.icon} href={item.href}>
                                {item.label}
                            </Dropdown.Item>
                        ))}
                        <Dropdown.Separator />
                        <AccountMenuItems />
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
        </nav>
    );
}
