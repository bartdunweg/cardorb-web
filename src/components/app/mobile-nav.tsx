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

const tabClass = "flex flex-1 flex-col items-center gap-0.5 rounded-full py-1 text-xs/4 font-medium transition";

// Bottom tab bar for mobile: four destinations in a pill. The rest of the sidebar is behind
// MobileAccountMenu, at the top right of Home.
export function MobileTabBar() {
    const pathname = usePathname();

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
                        <Icon className={cx("size-4", active ? "text-fg-brand-primary" : "text-fg-quaternary")} />
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}

// The account as a circle, for the phone bar at the top of Home. Opens what the sidebar has and
// the tab bar does not, then the account's own entries, so a phone reaches all of it.
export function MobileAccountMenu({ account }: { account: Account }) {
    return (
        <Dropdown.Root>
            <AriaButton
                aria-label="More"
                className={({ isFocusVisible }) => cx("cursor-pointer rounded-full outline-offset-2 outline-focus-ring", isFocusVisible && "outline-2")}
            >
                <Avatar size="sm" src={account.avatarUrl ?? undefined} alt="" />
            </AriaButton>
            <Dropdown.Popover placement="bottom end" offset={8}>
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
    );
}
