"use client";

import { Suspense, use } from "react";
import { BookOpen01, Folder, Heart, HomeLine, Plus, Rows01, Star01 } from "@untitledui/icons";
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
type FolderLink = { id: string; name: string; kind: "manual" | "rule"; count: number };

// Icons are component functions, so nav items are built here (client) — they can't be passed
// from a Server Component. Home, All cards, the wishlist (cards you do not have, so outside the
// collection) and Browse (every set there has been, not your collection) at the top, the same
// three the phone's tab bar carries plus Browse; under the Collections heading the rest, flat:
// Favorites, the Pokédex, each with its own icon, and the ones you made with a folder's, then
// New folder. On desktop this list is the overview; the Collections page is the phone's.
//
// The folders and the account arrive as promises: the layout hands them over without waiting, so
// the frame is on screen while the API answers, and each slot fills in on its own.
// The pages the sidebar leads to, fetched ahead so a click draws them at once. The Pokédex is not
// among them: it reads every card you own, up to 2,000 per request, and paying for that on the
// chance of a click made the page you are on wait for it.
const SIDEBAR_ROUTES = ["/dashboard", "/dashboard/collections", "/dashboard/cards", "/dashboard/favorites", "/dashboard/sets", "/dashboard/wishlist"];

export function AppSidebar({
    account,
    collections,
    favoritesCount,
    pokedexCount,
}: {
    account: Promise<Account>;
    collections: Promise<FolderLink[]>;
    favoritesCount: Promise<number | null>;
    pokedexCount: Promise<number | null>;
}) {
    const pathname = usePathname();

    const navItems: (NavItemType | NavItemDividerType)[] = [
        { label: "Home", href: "/dashboard", icon: HomeLine },
        { label: "Browse", href: "/dashboard/sets", icon: BookOpen01 },
        { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
        { label: "Collection", href: "/dashboard/cards", icon: Rows01 },
        // The head is the overview itself: on a phone the Binders tab opens it, on a desktop nothing did
        // but Back from Favorites or the Pokédex.
        { divider: true, label: "Binders", href: "/dashboard/collections" },
        {
            label: "Favorites",
            href: "/dashboard/favorites",
            icon: Star01,
            badge: (
                <Suspense fallback={null}>
                    <LateCount count={favoritesCount} />
                </Suspense>
            ),
        },
        // A folder like the ones below it, with a count like theirs. The Pokédex is one of the
        // two that are always there, not a different kind of thing: a binder whose rule is the
        // range and the rarities you collect, and drawing it as a grid, or without its number,
        // said otherwise.
        {
            label: "Pokédex",
            href: "/dashboard/pokedex",
            icon: Folder,
            badge: (
                <Suspense fallback={null}>
                    <LateCount count={pokedexCount} />
                </Suspense>
            ),
        },
    ];

    return (
        <>
            <PrefetchRoutes hrefs={SIDEBAR_ROUTES} />
            {/* The kit's root was an <aside>, so on desktop the whole navigation was a complementary
                landmark and "jump to navigation" found nothing at all. The landmark is made from here,
                named as the phone's tab bar is, and the kit's root is a <div> now (marked in its file):
                Chrome exposed the unnamed <aside> inside this <nav> as a second, nameless landmark.
                max-lg:hidden because both children are already hidden below lg: without it an empty
                second "Primary" would stand beside the tab bar's. */}
            <nav aria-label="Primary" className="max-lg:hidden">
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
                                            New binder
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
            </nav>
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
                        {/*
                         * A folder, however it was filled. A rule folder used to
                         * draw a flowchart, which named the mechanism rather than
                         * the thing: from the sidebar it is a folder with cards in
                         * it, and how they got there is the folder's own business.
                         */}
                        <NavItemBase type="link" icon={Folder} href={href} current={activeUrl === href} badge={<Count count={c.count} />}>
                            {c.name}
                        </NavItemBase>
                    </li>
                );
            })}
        </>
    );
}

// How many cards are in a binder, at the row's end as the Binders page's rows have it: a number
// alone, not the kit's pill, which would make every row a notification.
function Count({ count }: { count: number }) {
    return (
        <span className="ml-3 shrink-0 text-sm text-tertiary tabular-nums">
            {count}
            <span className="sr-only"> card{count === 1 ? "" : "s"}</span>
        </span>
    );
}

/** A count that arrives after the frame (Favorites, the Pokédex); null when its read failed, and the row goes without. */
function LateCount({ count }: { count: Promise<number | null> }) {
    const n = use(count);
    return n === null ? null : <Count count={n} />;
}

function AccountSlot({ account }: { account: Promise<Account> }) {
    return (
        <div className="arrive">
            <AccountMenu account={use(account)} />
        </div>
    );
}
