"use client";

import { Suspense, use } from "react";
import { BookOpen01, Folder, Heart, HomeLine, Plus, Rows01, Star01 } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { AccountMenu } from "@/components/app/account-menu";
import { SidebarSearchTrigger } from "@/components/app/command-search";
import { FolderDialog } from "@/components/app/folder-dialog";
import { AccountCardSkeleton, FolderRowsSkeleton } from "@/components/app/skeletons";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";

type Account = { name: string; email: string; avatarUrl: string | null };
type FolderLink = { id: string; name: string };

// Icons are component functions, so nav items are built here (client) — they can't be passed
// from a Server Component. Home, Browse (every set there has been, not your collection) and
// the wishlist (cards you do not have, so outside it too) at the top; under the Collection heading every folder, flat: All cards, Favorites,
// the Pokédex, each with its own icon, and the ones you made with a folder's, then New folder. On desktop this list is the
// overview; the Folders page is the phone's.
//
// The folders and the account arrive as promises: the layout hands them over without waiting, so
// the frame is on screen while the API answers, and each slot fills in on its own.
export function AppSidebar({ account, collections }: { account: Promise<Account>; collections: Promise<FolderLink[]> }) {
    const pathname = usePathname();

    const navItems: (NavItemType | NavItemDividerType)[] = [
        { label: "Home", href: "/dashboard", icon: HomeLine },
        { label: "Browse", href: "/dashboard/sets", icon: BookOpen01 },
        { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
        { divider: true, label: "Collection" },
        { label: "All cards", href: "/dashboard/cards", icon: Rows01 },
        { label: "Favorites", href: "/dashboard/favorites", icon: Star01 },
        { label: "Pokédex", href: "/dashboard/pokedex", icon: Folder },
    ];

    return (
        <SidebarNavigationSectionDividers
            activeUrl={pathname}
            items={navItems}
            hideMobileHeader
            search={<SidebarSearchTrigger />}
            afterItems={
                <>
                    <Suspense fallback={<FolderRowsSkeleton />}>
                        <FolderRows collections={collections} activeUrl={pathname} />
                    </Suspense>
                    {/* Drawn as a nav item, so it sits on the items' line: the same padding, icon size and type. */}
                    <div className="px-4 pt-px">
                        <FolderDialog mode="create">
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
                </>
            }
            footer={
                <Suspense fallback={<AccountCardSkeleton />}>
                    <AccountSlot account={account} />
                </Suspense>
            }
        />
    );
}

// The folders you made, continuing the list above at the same padding and row height.
function FolderRows({ collections, activeUrl }: { collections: Promise<FolderLink[]>; activeUrl: string }) {
    const list = use(collections);
    if (list.length === 0) return null;
    return (
        <ul className="flex arrive flex-col px-4">
            {list.map((c) => {
                const href = `/dashboard/collections/${c.id}`;
                return (
                    <li key={c.id} className="py-px">
                        <NavItemBase type="link" icon={Folder} href={href} current={activeUrl === href}>
                            {c.name}
                        </NavItemBase>
                    </li>
                );
            })}
        </ul>
    );
}

function AccountSlot({ account }: { account: Promise<Account> }) {
    return (
        <div className="arrive">
            <AccountMenu account={use(account)} />
        </div>
    );
}
