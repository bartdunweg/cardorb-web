"use client";

import type { ReactNode } from "react";
import { SearchLg } from "@untitledui/icons";
import Link from "next/link";
import { Input } from "@/components/base/input/input";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard } from "../base-components/nav-account-card";
import { NavList } from "../base-components/nav-list";
import type { NavItemDividerType, NavItemType } from "../config";

interface SidebarNavigationSectionDividersProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: (NavItemType | NavItemDividerType)[];
    /** Content rendered at the bottom. When set, it replaces the default account card. */
    footer?: ReactNode;
    /** Action rendered top-right, next to the logo. */
    headerAction?: ReactNode;
    /** Hide the mobile hamburger header (e.g. when a bottom tab bar is used instead). */
    hideMobileHeader?: boolean;
    /** Replaces the default search inputs (e.g. a button that opens a command palette). */
    search?: ReactNode;
    /** At the list's end, inside it: the folders that stream in and New folder, as `<li>`s. */
    afterItems?: ReactNode;
}

export const SidebarNavigationSectionDividers = ({
    activeUrl,
    items,
    footer,
    headerAction,
    hideMobileHeader,
    search,
    afterItems,
}: SidebarNavigationSectionDividersProps) => {
    const MAIN_SIDEBAR_WIDTH = 276;

    const content = (
        <aside
            style={
                {
                    "--width": `${MAIN_SIDEBAR_WIDTH}px`,
                } as React.CSSProperties
            }
            // The same hairline ring as an input and the search pill inside it, so the sidebar's edge and
            // the controls on it are one line; the lift without the scale's own rim, so it is one line.
            className="flex h-full w-full max-w-full flex-col justify-between overflow-auto glass-thick pt-4 shadow-lift-lg ring-1 ring-primary ring-inset lg:w-(--width) lg:rounded-xl lg:pt-5"
        >
            <div className="flex flex-col gap-5 px-4 lg:px-5">
                <div className="flex items-center justify-between gap-2">
                    <Link href="/" className="text-lg font-semibold text-primary transition hover:opacity-70">
                        Cardorb
                    </Link>
                    {headerAction}
                </div>

                {search ?? (
                    <>
                        {/* Mobile search input */}
                        <Input size="md" aria-label="Search" placeholder="Search" icon={SearchLg} className="md:hidden" />

                        {/* Desktop search input */}
                        <Input shortcut size="sm" aria-label="Search" placeholder="Search" icon={SearchLg} className="max-md:hidden" />
                    </>
                )}
            </div>

            <NavList activeUrl={activeUrl} items={items}>
                {afterItems}
            </NavList>

            <div className="mt-auto flex flex-col gap-5 px-2 py-4 lg:gap-6 lg:px-4 lg:py-4">{footer ?? <NavAccountCard />}</div>
        </aside>
    );

    return (
        <>
            {/* Mobile header navigation */}
            {!hideMobileHeader && <MobileNavigationHeader>{content}</MobileNavigationHeader>}

            {/* Desktop sidebar navigation */}
            {/* 12 px around the panel: it floats on glass with a shadow, and the kit's 4 px read as none. */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:py-3 lg:pl-3">{content}</div>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <div
                style={{
                    paddingLeft: MAIN_SIDEBAR_WIDTH + 12, // The 12 px inset of the sidebar wrapper
                }}
                className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
            />
        </>
    );
};
