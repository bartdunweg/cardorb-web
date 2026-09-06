"use client";

import { Suspense, use } from "react";
import { BookOpen01, Dataflow03, Folder, Grid01, Heart, HomeLine, Plus, Rows01, Star01 } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { AccountMenu } from "@/components/app/account-menu";
import { SidebarSearchTrigger } from "@/components/app/command-search";
import { FolderDialog } from "@/components/app/folder-dialog";
import { PrefetchRoutes } from "@/components/app/prefetch-routes";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";

type Account = { name: string; email: string; avatarUrl: string | null };
type FolderLink = { id: string; name: string; kind: "manual" | "rule" };

// Icons are component functions, so nav items are built here (client) — they can't be passed
// from a Server Component. Home, All cards, the wishlist (cards you do not have, so outside the
// collection) and Browse (every set there has been, not your collection) at the top, the same
// three the phone's tab bar carries plus Browse; under the Collections heading the rest, flat:
// Favorites, the Pokédex, each with its own icon, and the ones you made with a folder's, then
// New folder. On desktop this list is the overview; the Collections page is the phone's.
//
// The folders and the account arrive as promises: the layout hands them over without waiting, so
// the frame is on screen while the API answers, and each slot fills in on its own.
// The pages the sidebar leads to, fetched ahead so a click draws them at once.
const SIDEBAR_ROUTES = [
    "/dashboard",
    "/dashboard/collections",
    "/dashboard/cards",
    "/dashboard/favorites",
    "/dashboard/pokedex",
    "/dashboard/sets",
    "/dashboard/wishlist",
];

export function AppSidebar({ account, collections }: { account: Promise<Account>; collections: Promise<FolderLink[]> }) {
    const pathname = usePathname();

    const navItems: (NavItemType | NavItemDividerType)[] = [
        { label: "Home", href: "/dashboard", icon: HomeLine },
        { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
        { label: "All cards", href: "/dashboard/cards", icon: Rows01 },
        { label: "Browse", href: "/dashboard/sets", icon: BookOpen01 },
        { divider: true, label: "Collections" },
        { label: "Favorites", href: "/dashboard/favorites", icon: Star01 },
        { label: "Pokédex", href: "/dashboard/pokedex", icon: Grid01 },
    ];

    return (
        <>
            <PrefetchRoutes hrefs={SIDEBAR_ROUTES} />
            <SidebarNavigationSectionDividers
                activeUrl={pathname}
                items={navItems}
                hideMobileHeader
                search={<SidebarSearchTrigger />}
                afterItems={
                    <>
                        <Suspense fallback={null}>
                            <FolderRows collections={collections} activeUrl={pathname} />
                        </Suspense>
                        {/* An item like the others: the same padding, icon size and type, at the list's end. */}
                        <li className="py-px">
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
                        </li>
                    </>
                }
                footer={
                    <Suspense fallback={null}>
                        <AccountSlot account={account} />
                    </Suspense>
                }
            />
        </>
    );
}

// The folders you made: more items of the same list, at the same padding and row height.
function FolderRows({ collections, activeUrl }: { collections: Promise<FolderLink[]>; activeUrl: string }) {
    const list = use(collections);
    return (
        <>
            {list.map((c) => {
                const href = `/dashboard/collections/${c.id}`;
                return (
                    <li key={c.id} className="arrive py-px">
                        <NavItemBase type="link" icon={c.kind === "rule" ? Dataflow03 : Folder} href={href} current={activeUrl === href}>
                            {c.name}
                        </NavItemBase>
                    </li>
                );
            })}
        </>
    );
}

function AccountSlot({ account }: { account: Promise<Account> }) {
    return (
        <div className="arrive">
            <AccountMenu account={use(account)} />
        </div>
    );
}
