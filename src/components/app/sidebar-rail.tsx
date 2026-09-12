"use client";

import { type FC, type ReactNode, Suspense, use, useState } from "react";
import { ChevronRightDouble, Folder, Plus, SearchLg, Star01 } from "@untitledui/icons";
import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@/components/app/account-menu";
import { useCommandSearch } from "@/components/app/command-search";
import { FolderModal } from "@/components/app/folder-dialog";
import { NavButton } from "@/components/application/app-navigation/base-components/nav-button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";

type Account = { name: string; email: string; avatarUrl: string | null };
type FolderLink = { id: string; name: string; kind: "manual" | "rule"; count: number };
type RailItem = { label: string; href: string; icon: FC<{ className?: string }> };

/**
 * The sidebar folded: a rail of icons, each named by its tooltip, on the kit's slim sidebar's
 * shapes. Top to bottom the rows are the open sidebar's rows: the mark where the wordmark stands,
 * search where the search pill stands, then the four pages, then the binders, so nothing on the
 * rail sits at a different height from the row it replaces and folding moves no icon up or down.
 * Every binder is the same folder icon, so on the rail the binders are one icon that opens a menu
 * of them (Favorites, the ones you made, New binder), with the overview at its head.
 * At the foot the button that unfolds it and the account's avatar, which opens the card's menu.
 */
export function SidebarRail({
    items,
    activeUrl,
    account,
    collections,
    onExpand,
}: {
    items: RailItem[];
    activeUrl: string;
    account: Promise<Account>;
    collections: Promise<FolderLink[]>;
    onExpand: () => void;
}) {
    const { open } = useCommandSearch();

    return (
        <>
            {/* The same wrapper the open sidebar's head has, so the mark sits on the wordmark's line
                and search on the search pill's: px-4 rather than lg:px-5 because 68 px of rail leaves
                room for one 36 px row and no more. */}
            <div className="flex flex-col gap-5 px-4">
                <div className="flex h-8 items-center justify-center">
                    <Link
                        href="/"
                        aria-label="Cardorb"
                        className="rounded-md outline-focus-ring transition hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                        <Image src="/mark.png" alt="" width={28} height={28} className="size-7 rounded-lg" />
                    </Link>
                </div>

                {/* 38 px, not the icon row's 36: that is what the search pill measures when the
                    sidebar is open, and the four rows under it line up only if this row is its height. */}
                <NavButton icon={SearchLg} label="Search" onPress={open} className="h-[38px] w-9" />
            </div>

            <ul className="flex flex-col px-4 pt-5">
                {items.map((item) => (
                    <li key={item.href} className="py-px">
                        <NavButton icon={item.icon} label={item.label} href={item.href} current={activeUrl === item.href} />
                    </li>
                ))}
                {/* Where the open sidebar heads its list with "Binders", the rail rules a line: a
                    section head is a word, and there is no room for one. */}
                <li className="w-full px-0.5 pt-5 pb-1">
                    <hr className="h-px w-full border-none bg-border-secondary" />
                </li>
                <li className="py-px">
                    {/* Until the binders arrive the icon is a link to the overview: a menu's items cannot stream in. */}
                    <Suspense fallback={<NavButton icon={Folder} label="Binders" href="/dashboard/collections" current={inBinders(activeUrl)} />}>
                        <BindersMenu activeUrl={activeUrl} collections={collections} />
                    </Suspense>
                </li>
            </ul>

            {/* The foot the account card has when the sidebar is open, and the button that unfolds it
                above the avatar: at the head it would stand where the mark belongs. */}
            <div className="mt-auto flex flex-col items-center gap-3 px-4 py-4">
                <ButtonUtility size="sm" color="tertiary" icon={ChevronRightDouble} tooltip="Expand sidebar" tooltipPlacement="right" onClick={onExpand} />
                <Suspense fallback={null}>
                    <AccountSlot account={account} />
                </Suspense>
            </div>
        </>
    );
}

// One icon for every binder. The menu opens beside the rail, the overview first, then Favorites,
// which is always there, the ones you made as they arrive, and New binder, which opens the same
// dialog the open sidebar's row does; a menu item cannot be a dialog's trigger, so the dialog is
// controlled from here.
function BindersMenu({ activeUrl, collections }: { activeUrl: string; collections: Promise<FolderLink[]> }) {
    const list = use(collections);
    const [creating, setCreating] = useState(false);
    // Which binder you have open. On the rail nothing else says it: there is no label, and the tint
    // the open row carries is 1.04:1, so the name goes in the icon's own name and its tooltip.
    const here = [
        { href: "/dashboard/collections", label: "All binders" },
        { href: "/dashboard/favorites", label: "Favorites" },
        ...list.map((c) => ({ href: `/dashboard/collections/${c.id}`, label: c.name })),
    ].find((b) => b.href === activeUrl);
    return (
        <>
            <Dropdown.Root>
                <NavButton icon={Folder} label="Binders" name={here ? `Binders: ${here.label}` : "Binders"} current={inBinders(activeUrl)} />
                <Dropdown.Popover placement="right top" className="w-64">
                    <Dropdown.Menu>
                        <BinderItem href="/dashboard/collections" activeUrl={activeUrl} icon={Folder}>
                            All binders
                        </BinderItem>
                        <Dropdown.Separator />
                        <BinderItem href="/dashboard/favorites" activeUrl={activeUrl} icon={Star01}>
                            Favorites
                        </BinderItem>
                        {list.map((c) => (
                            <BinderItem key={c.id} href={`/dashboard/collections/${c.id}`} activeUrl={activeUrl} icon={Folder}>
                                {c.name}
                            </BinderItem>
                        ))}
                        <Dropdown.Separator />
                        <Dropdown.Item icon={Plus} onAction={() => setCreating(true)}>
                            New binder
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
            <FolderModal mode="create" isOpen={creating} onOpenChange={setCreating} />
        </>
    );
}

// react-aria's MenuItem does not carry aria-current through, so the page you are on says so in
// the item's own words, where a screen reader reads it and a sighted reader does not.
function BinderItem({ href, activeUrl, icon, children }: { href: string; activeUrl: string; icon: FC<{ className?: string }>; children: ReactNode }) {
    return (
        <Dropdown.Item icon={icon} href={href}>
            {children}
            {activeUrl === href ? <span className="sr-only"> (current page)</span> : null}
        </Dropdown.Item>
    );
}

/** Every page that is a binder: the overview, Favorites, and the ones you made (a Pokédex among them). */
function inBinders(activeUrl: string) {
    return activeUrl.startsWith("/dashboard/collections") || activeUrl.startsWith("/dashboard/favorites");
}

function AccountSlot({ account }: { account: Promise<Account> }) {
    return (
        <div className="arrive">
            <AccountMenu account={use(account)} compact />
        </div>
    );
}

// Kept for the type: the rail's items are the sidebar's first four, handed over as plain links.
export type { RailItem };
