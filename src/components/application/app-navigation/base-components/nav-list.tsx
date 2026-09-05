"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ChevronDown } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import type { NavItemDividerType, NavItemType } from "../config";
import { NavItemBase } from "./nav-item";

// A nav item that both links (label/icon navigate to its href) and expands (a chevron toggles
// its children). Used for Collections: clicking the label opens the overview, the chevron reveals
// the individual collections.
const NavCollapsibleWithLink = ({ item, activeUrl }: { item: NavItemType; activeUrl?: string }) => {
    const childActive = item.items?.some((sub) => sub.href === activeUrl) ?? false;
    const [open, setOpen] = useState(childActive);

    useEffect(() => {
        if (childActive) setOpen(true);
    }, [childActive]);

    return (
        <li className="py-px">
            <div className="relative">
                <NavItemBase type="link" icon={item.icon} badge={item.badge} href={item.href} current={activeUrl === item.href}>
                    {item.label}
                </NavItemBase>
                <button
                    type="button"
                    aria-label={open ? "Collapse" : "Expand"}
                    aria-expanded={open}
                    onClick={() => setOpen((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center rounded-md px-2.5 outline-focus-ring focus-visible:z-10 focus-visible:outline-2"
                >
                    <ChevronDown className={cx("size-4 shrink-0 stroke-[2.5px] text-fg-quaternary transition-transform", open && "-scale-y-100")} />
                </button>
            </div>

            {open && (
                <ul className="pb-1">
                    {item.items!.map((childItem) => (
                        <li key={childItem.label} className="py-0.25">
                            <NavItemBase href={childItem.href} badge={childItem.badge} type="collapsible-child" current={activeUrl === childItem.href}>
                                {childItem.label}
                            </NavItemBase>
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
};

interface NavListProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** More `<li>`s at the list's end, in the same list: the folders that stream in, and New folder. */
    children?: ReactNode;
    /** Additional CSS classes to apply to the list. */
    className?: string;
    /** List of items to display. */
    items: (NavItemType | NavItemDividerType)[];
}

export const NavList = ({ activeUrl, items, className, children }: NavListProps) => {
    return (
        <ul className={cx("flex flex-col px-4 pt-5", className)}>
            {items.map((item, index) => {
                if (item.divider) {
                    // A divider with a label heads a section; without a label it is a rule.
                    return item.label ? (
                        <li key={index} className="pt-5 pb-1">
                            <span className="block px-3 py-0.5 text-xs font-semibold text-quaternary">{item.label}</span>
                        </li>
                    ) : (
                        <li key={index} className="w-full px-0.5 py-2">
                            <hr className="h-px w-full border-none bg-border-secondary" />
                        </li>
                    );
                }

                if (item.items?.length) {
                    return <NavCollapsibleWithLink key={item.label} item={item} activeUrl={activeUrl} />;
                }

                return (
                    <li key={item.label} className="py-px">
                        <NavItemBase type="link" badge={item.badge} icon={item.icon} href={item.href} current={activeUrl === item.href}>
                            {item.label}
                        </NavItemBase>
                    </li>
                );
            })}
            {children}
        </ul>
    );
};
