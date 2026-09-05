"use client";

import { BookOpen01, Folder, Heart, HomeLine, Plus } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/app/account-menu";
import { SidebarSearchTrigger } from "@/components/app/command-search";
import { FolderDialog } from "@/components/app/folder-dialog";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";
import { Button } from "@/components/base/buttons/button";
import type { Facets } from "@/lib/cards";

type Account = { name: string; email: string; avatarUrl: string | null };

// Icons are component functions, so nav items are built here (client) — they can't be passed
// from a Server Component. Home, Browse (every set there has been, not your collection) and
// the wishlist (cards you do not have, so outside it too) at the top; under the Collection heading every folder, flat: All cards, Favorites,
// the Pokédex, and the ones you made, with New folder at the end. On desktop this list is the
// overview; the Folders page is the phone's.
export function AppSidebar({ account, collections, facets }: { account: Account; collections: { id: string; name: string }[]; facets: Facets }) {
    const pathname = usePathname();

    const navItems: (NavItemType | NavItemDividerType)[] = [
        { label: "Home", href: "/dashboard", icon: HomeLine },
        { label: "Browse", href: "/dashboard/sets", icon: BookOpen01 },
        { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
        { divider: true, label: "Collection" },
        { label: "All cards", href: "/dashboard/cards", icon: Folder },
        { label: "Favorites", href: "/dashboard/favorites", icon: Folder },
        { label: "Pokédex", href: "/dashboard/pokedex", icon: Folder },
        ...collections.map((c) => ({ label: c.name, href: `/dashboard/collections/${c.id}`, icon: Folder })),
    ];

    return (
        <SidebarNavigationSectionDividers
            activeUrl={pathname}
            items={navItems}
            hideMobileHeader
            search={<SidebarSearchTrigger />}
            afterItems={
                <div className="px-4 pt-1 lg:px-5">
                    <FolderDialog mode="create" facets={facets}>
                        <Button color="link-gray" size="sm" iconLeading={Plus}>
                            New folder
                        </Button>
                    </FolderDialog>
                </div>
            }
            footer={<AccountMenu account={account} />}
        />
    );
}
