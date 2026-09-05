"use client";

import { BookOpen01, Folder, Grid01, Heart, HomeLine, Rows01, Star01 } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/app/account-menu";
import { SidebarSearchTrigger } from "@/components/app/command-search";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";

type Account = { name: string; email: string; avatarUrl: string | null };

// Icons are component functions, so nav items are built here (client) — they can't be passed
// from a Server Component. The collection is one set of cards with four views on it: all of them,
// by set, by Pokémon, the favorites. Folders and the wishlist sit outside it: a folder is a
// grouping you made, and a wished card is not owned. Folders from the server expand under the
// Folders item (the label still navigates to the overview).
export function AppSidebar({ account, collections }: { account: Account; collections: { id: string; name: string }[] }) {
    const pathname = usePathname();

    const navItems: (NavItemType | NavItemDividerType)[] = [
        { label: "Home", href: "/dashboard", icon: HomeLine },
        { divider: true, label: "Collection" },
        { label: "All cards", href: "/dashboard/cards", icon: Rows01 },
        { label: "Sets", href: "/dashboard/sets", icon: BookOpen01 },
        { label: "Pokédex", href: "/dashboard/pokedex", icon: Grid01 },
        { label: "Favorites", href: "/dashboard/favorites", icon: Star01 },
        { divider: true },
        {
            label: "Folders",
            href: "/dashboard/collections",
            icon: Folder,
            items: collections.length ? collections.map((c) => ({ label: c.name, href: `/dashboard/collections/${c.id}` })) : undefined,
        },
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
