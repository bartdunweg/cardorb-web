"use client";

import { BookOpen01, Folder, Heart, HomeLine, Plus, Rows01, Star01 } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { AccountMenu } from "@/components/app/account-menu";
import { SidebarSearchTrigger } from "@/components/app/command-search";
import { FolderDialog } from "@/components/app/folder-dialog";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";
import type { Facets } from "@/lib/cards";

type Account = { name: string; email: string; avatarUrl: string | null };

// Icons are component functions, so nav items are built here (client) — they can't be passed
// from a Server Component. Home, Browse (every set there has been, not your collection) and
// the wishlist (cards you do not have, so outside it too) at the top; under the Collection heading every folder, flat: All cards, Favorites,
// the Pokédex, each with its own icon, and the ones you made with a folder's, then New folder. On desktop this list is the
// overview; the Folders page is the phone's.
export function AppSidebar({ account, collections, facets }: { account: Account; collections: { id: string; name: string }[]; facets: Facets }) {
    const pathname = usePathname();

    const navItems: (NavItemType | NavItemDividerType)[] = [
        { label: "Home", href: "/dashboard", icon: HomeLine },
        { label: "Browse", href: "/dashboard/sets", icon: BookOpen01 },
        { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
        { divider: true, label: "Collection" },
        { label: "All cards", href: "/dashboard/cards", icon: Rows01 },
        { label: "Favorites", href: "/dashboard/favorites", icon: Star01 },
        { label: "Pokédex", href: "/dashboard/pokedex", icon: Folder },
        ...collections.map((c) => ({ label: c.name, href: `/dashboard/collections/${c.id}`, icon: Folder })),
    ];

    return (
        <SidebarNavigationSectionDividers
            activeUrl={pathname}
            items={navItems}
            hideMobileHeader
            search={<SidebarSearchTrigger />}
            // Drawn as a nav item, so it sits on the items' line: the same padding, icon size and type.
            afterItems={
                <div className="px-4 pt-px">
                    <FolderDialog mode="create" facets={facets}>
                        <AriaButton className="group relative flex max-h-9 w-full cursor-pointer items-center rounded-md bg-primary p-2 outline-focus-ring transition duration-100 ease-linear select-none hover:bg-primary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2">
                            <Plus
                                aria-hidden="true"
                                className="mr-2 size-5 shrink-0 text-fg-quaternary transition-inherit-all group-hover:text-fg-quaternary_hover"
                            />
                            <span className="flex-1 text-left text-sm font-semibold text-secondary transition-inherit-all group-hover:text-secondary_hover">
                                New folder
                            </span>
                        </AriaButton>
                    </FolderDialog>
                </div>
            }
            footer={<AccountMenu account={account} />}
        />
    );
}
