"use client";

import { Folder, Grid01, Heart, HomeLine, Rows01, Star01 } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/app/account-menu";
import { SidebarSearchTrigger } from "@/components/app/command-search";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";

type Account = { name: string; email: string; avatarUrl: string | null };

// Icons are component functions, so nav items are built here (client) — they can't be passed
// from a Server Component. Collections come from the server and, when present, expand under the
// Collections item (the label still navigates to the overview).
export function AppSidebar({ account, collections }: { account: Account; collections: { id: string; name: string }[] }) {
    const pathname = usePathname();

    const navItems: (NavItemType | NavItemDividerType)[] = [
        { label: "Home", href: "/dashboard", icon: HomeLine },
        { label: "Cards", href: "/dashboard/cards", icon: Rows01 },
        { label: "Pokédex", href: "/dashboard/pokedex", icon: Grid01 },
        {
            label: "Collections",
            href: "/dashboard/collections",
            icon: Folder,
            items: collections.length ? collections.map((c) => ({ label: c.name, href: `/dashboard/collections/${c.id}` })) : undefined,
        },
        { label: "Favorites", href: "/dashboard/favorites", icon: Star01 },
        { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
    ];

    return (
        <SidebarNavigationSectionDividers
            activeUrl={pathname}
            items={navItems}
            hideMobileHeader
            search={<SidebarSearchTrigger />}
            footer={<AccountMenu account={account} />}
        />
    );
}
