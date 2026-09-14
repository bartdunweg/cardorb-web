"use client";

import { Suspense, use, useEffect, useState } from "react";
import { BookOpen01, Folder, Heart, HomeLine, LayoutLeft, Plus, Rows01, Star01 } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { sidebarCounts } from "@/app/(app)/sidebar-actions";
import { AccountMenu } from "@/components/app/account-menu";
import { SidebarSearchTrigger } from "@/components/app/command-search";
import { FolderDialog } from "@/components/app/folder-dialog";
import { PrefetchRoutes } from "@/components/app/prefetch-routes";
import { useRouteTarget } from "@/components/app/route-pending";
import { type RailItem, SidebarRail, useBindersArrive } from "@/components/app/sidebar-rail";
import { CARDS_CHANGED } from "@/components/app/use-copy-steps";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSectionDividers } from "@/components/application/app-navigation/sidebar-navigation/sidebar-section-dividers";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { SIDEBAR_COOKIE } from "@/lib/sidebar-cookie";
import { cx } from "@/utils/cx";

type Account = { name: string; email: string; avatarUrl: string | null };
type FolderLink = { id: string; name: string; kind: "manual" | "rule"; count: number };

// Icons are component functions, so nav items are built here (client); they can't be passed
// from a Server Component. Home, All cards, the wishlist (cards you do not have, so outside the
// collection) and Browse (every set there has been, not your collection) at the top, the same
// three the phone's tab bar carries plus Browse; under the Collections heading the rest, flat:
// Favorites with its own icon, and the ones you made with a folder's, then New folder. On desktop
// this list is the overview; the Collections page is the phone's.
//
// The folders and the account arrive as promises: the layout hands them over without waiting, so
// the frame is on screen while the API answers, and each slot fills in on its own.
// The pages the sidebar leads to, fetched ahead so a click draws them at once. A binder is not
// among them, and a binder shown as a Pokédex is why: it reads every card you own, up to 2,000
// per request, and paying for that on the chance of a click made the page you are on wait for it.
const SIDEBAR_ROUTES = ["/dashboard", "/dashboard/collections", "/dashboard/cards", "/dashboard/favorites", "/dashboard/sets", "/dashboard/wishlist"];

// Folded or open, kept for a year; open is no cookie at all (see src/lib/sidebar-cookie.ts).
function storeCollapsed(collapsed: boolean) {
    document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : ""}; path=/; max-age=${collapsed ? 60 * 60 * 24 * 365 : 0}; SameSite=Lax`;
}

export function AppSidebar({
    account,
    collections,
    favoritesCount,
    initialCollapsed = false,
}: {
    account: Promise<Account>;
    collections: Promise<FolderLink[]>;
    favoritesCount: Promise<number | null>;
    /** Folded to the rail on the first paint: what the cookie said when the layout rendered. */
    initialCollapsed?: boolean;
}) {
    // Where a click is going, or where we are between clicks: the row lights up on the click, not
    // when the page lands, because the page you clicked from stays on screen until the next one is
    // ready (route-pending.tsx).
    const pathname = useRouteTarget();
    // Folded or open: a choice that stays, so it lives in the cookie and in state, not in the URL.
    const [collapsed, setCollapsed] = useState(initialCollapsed);
    const setFolded = (folded: boolean) => {
        setCollapsed(folded);
        storeCollapsed(folded);
    };

    /* The numbers read again after a list's tiles stepped copies. Those presses do not draw the page
       again, so the layout's read stays from before them; the sidebar asks for its own, and puts
       the answer over the layout's until the layout reads again (a navigation that redraws it). */
    const [fresh, setFresh] = useState<{ of: Promise<FolderLink[]>; collections: FolderLink[]; favorites: number | null } | null>(null);
    useEffect(() => {
        const reread = () => void sidebarCounts().then((r) => setFresh({ of: collections, ...r }));
        window.addEventListener(CARDS_CHANGED, reread);
        return () => window.removeEventListener(CARDS_CHANGED, reread);
    }, [collections]);
    const override = fresh?.of === collections ? fresh : null;

    // The four pages, on the rail as icons alone.
    const pages: RailItem[] = [
        { label: "Home", href: "/dashboard", icon: HomeLine },
        { label: "Browse", href: "/dashboard/sets", icon: BookOpen01 },
        { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
        { label: "Collection", href: "/dashboard/cards", icon: Rows01 },
    ];

    const navItems: (NavItemType | NavItemDividerType)[] = [
        ...pages,
        // The head is the overview itself: on a phone the Binders tab opens it, on a desktop nothing did
        // but Back from Favorites or a binder.
        { divider: true, label: "Binders", href: "/dashboard/collections" },
        {
            label: "Favorites",
            href: "/dashboard/favorites",
            icon: Star01,
            badge: (
                <Suspense fallback={null}>
                    <LateCount count={favoritesCount} fresh={override ? override.favorites : undefined} />
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
                    collapsed={collapsed}
                    rail={<SidebarRail items={pages} activeUrl={pathname} account={account} collections={collections} onExpand={() => setFolded(false)} />}
                    headerAction={<ButtonUtility size="sm" color="tertiary" icon={LayoutLeft} tooltip="Collapse sidebar" onClick={() => setFolded(true)} />}
                    search={<SidebarSearchTrigger />}
                    afterItems={
                        <>
                            <Suspense fallback={null}>
                                <FolderRows collections={collections} fresh={override?.collections} activeUrl={pathname} />
                            </Suspense>
                            {/* An item like the others: the same padding, icon size and type, at the list's end. */}
                            <li className="py-px">
                                <FolderDialog mode="create">
                                    <AriaButton className="group relative flex max-h-9 w-full cursor-pointer items-center rounded-md p-2 outline-focus-ring transition duration-100 ease-linear select-none hover:bg-alpha-black/4 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2">
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
function FolderRows({ collections, fresh, activeUrl }: { collections: Promise<FolderLink[]>; fresh?: FolderLink[]; activeUrl: string }) {
    // Read again after a press on a list's tiles, where there is an answer; the layout's otherwise.
    const list = fresh ?? use(collections);
    const arrive = useBindersArrive();
    return (
        <>
            {list.map((c) => {
                const href = `/dashboard/collections/${c.id}`;
                return (
                    <li key={c.id} className={cx("py-px", arrive && "arrive")}>
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

/** A count that arrives after the frame (Favorites); null when its read failed, and the row goes without. */
function LateCount({ count, fresh }: { count: Promise<number | null>; fresh?: number | null }) {
    const n = fresh !== undefined ? fresh : use(count);
    return n === null ? null : <Count count={n} />;
}

function AccountSlot({ account }: { account: Promise<Account> }) {
    return (
        <div className="arrive">
            <AccountMenu account={use(account)} />
        </div>
    );
}
