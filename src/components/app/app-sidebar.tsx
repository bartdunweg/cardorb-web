"use client";

import { BookOpen01, Folder, Grid01, Heart, HomeLine, Rows01, Star01 } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/app/account-menu";
import { SidebarSearchTrigger } from "@/components/app/command-search";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";

type Account = { name: string; email: string; avatarUrl: string | null };

// Icons are component functions, so nav items are built here (client) — they can't be passed
// from a Server Component. The collection is one set of cards with two views on it: all of them
// and by set. Under Folders sit three that are always there, Favorites, Wishlist and the Pokédex,
// and then the ones you made; they expand under the Folders item, whose label still opens the
// overview.
export function AppSidebar({ account, collections }: { account: Account; collections: { id: string; name: string }[] }) {
    const pathname = usePathname();

    const navItems: (NavItemType | NavItemDividerType)[] = [
        { label: "Home", href: "/dashboard", icon: HomeLine },
        { divider: true, label: "Collection" },
        { label: "All cards", href: "/dashboard/cards", icon: Rows01 },
        { label: "Sets", href: "/dashboard/sets", icon: BookOpen01 },
        { divider: true },
        {
            label: "Folders",
            href: "/dashboard/collections",
            icon: Folder,
            items: [
                { label: "Favorites", href: "/dashboard/favorites", icon: Star01 },
                { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
                { label: "Pokédex", href: "/dashboard/pokedex", icon: Grid01 },
                ...collections.map((c) => ({ label: c.name, href: `/dashboard/collections/${c.id}` })),
            ],
        },
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
