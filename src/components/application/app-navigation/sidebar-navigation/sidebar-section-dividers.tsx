"use client";

// Changed from the kit: the root is a <div>, not an <aside>. app-sidebar.tsx wraps it in the
// <nav> that names the landmark, and an <aside> inside that read to Chrome as a nameless
// complementary landmark within the navigation — one landmark too many (HTML-AAM says generic;
// Chrome has not shipped that). Nothing styled on the tag.
//
// Also changed: the sidebar folds to a rail. The kit has no sidebar that folds; its slim variant
// is a rail that is always a rail. Here `collapsed` narrows the same panel to the slim variant's
// 68 px and draws `rail` (icons with tooltips, the app's own) in place of the header, the search,
// the list and the footer. The panel and the placeholder that holds its space animate the width;
// what is drawn inside swaps at once, clipped by the panel's edge while it moves.
import type { ReactNode } from "react";
import { SearchLg } from "@untitledui/icons";
import Link from "next/link";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";
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
    /** Folded to the rail: 68 px wide, `rail` drawn instead of everything else. */
    collapsed?: boolean;
    /** What the folded sidebar shows: icons with tooltips, top to bottom. */
    rail?: ReactNode;
}

/** The panel's width, open and folded, in CSS pixels. The folded one is the kit's slim sidebar's. */
export const SIDEBAR_WIDTH = { open: 276, collapsed: 68 } as const;

export const SidebarNavigationSectionDividers = ({
    activeUrl,
    items,
    footer,
    headerAction,
    hideMobileHeader,
    search,
    afterItems,
    collapsed = false,
    rail,
}: SidebarNavigationSectionDividersProps) => {
    const width = collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.open;

    const content = (
        <div
            style={
                {
                    "--width": `${width}px`,
                } as React.CSSProperties
            }
            // The same hairline ring as an input and the search pill inside it, so the sidebar's edge and
            // the controls on it are one line; the lift without the scale's own rim, so it is one line.
            className="flex h-full w-full max-w-full flex-col justify-between overflow-x-hidden overflow-y-auto glass-thick pt-4 shadow-lift-lg ring-1 ring-primary transition-[width] duration-200 ease-out ring-inset motion-reduce:transition-none lg:w-(--width) lg:rounded-xl lg:pt-5"
        >
            {collapsed ? (
                rail
            ) : (
                <>
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
                </>
            )}
        </div>
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
                    paddingLeft: width + 12, // The 12 px inset of the sidebar wrapper
                }}
                className={cx(
                    "invisible hidden transition-[padding] duration-200 ease-out motion-reduce:transition-none lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block",
                )}
            />
        </>
    );
};
