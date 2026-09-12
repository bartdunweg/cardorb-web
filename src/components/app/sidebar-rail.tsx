"use client";

import { type FC, type ReactNode, Suspense, use, useState } from "react";
import { ChevronRightDouble, Folder, Plus, SearchLg, Star01 } from "@untitledui/icons";
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
 * The sidebar folded: a rail of icons, each named by its tooltip, the look of the kit's slim
 * sidebar. Top to bottom: the button that unfolds it, search, the four pages, then Binders and
 * the account. Every binder is the same folder icon, so on the rail the binders are one icon that
 * opens a menu of them (Favorites, the Pokédex, the ones you made, New binder), with the overview
 * at its head; the account is its avatar, with the same menu as the open sidebar's card.
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
    const inBinders =
        activeUrl.startsWith("/dashboard/collections") || activeUrl.startsWith("/dashboard/favorites") || activeUrl.startsWith("/dashboard/pokedex");

    return (
        <>
            <div className="flex justify-center px-4">
                <ButtonUtility size="sm" color="tertiary" icon={ChevronRightDouble} tooltip="Expand sidebar" tooltipPlacement="right" onClick={onExpand} />
            </div>

            <ul className="mt-5 flex flex-col gap-0.5 px-4">
                <li>
                    <NavButton icon={SearchLg} label="Search" onPress={open} />
                </li>
                {items.map((item) => (
                    <li key={item.href}>
                        <NavButton icon={item.icon} label={item.label} href={item.href} current={activeUrl === item.href} />
                    </li>
                ))}
                <li className="py-2">
                    <hr className="h-px w-full border-none bg-border-secondary" />
                </li>
                <li>
                    {/* Until the binders arrive the icon is a link to the overview: a menu's items cannot stream in. */}
                    <Suspense fallback={<NavButton icon={Folder} label="Binders" href="/dashboard/collections" current={inBinders} />}>
                        <BindersMenu activeUrl={activeUrl} current={inBinders} collections={collections} />
                    </Suspense>
                </li>
            </ul>

            <div className="mt-auto flex flex-col items-center px-4 py-4">
                <Suspense fallback={null}>
                    <AccountSlot account={account} />
                </Suspense>
            </div>
        </>
    );
}

// One icon for every binder. The menu opens beside the rail, the overview first, then the two
// that are always there, the ones you made as they arrive, and New binder, which opens the same
// dialog the open sidebar's row does; a menu item cannot be a dialog's trigger, so the dialog is
// controlled from here.
function BindersMenu({ activeUrl, current, collections }: { activeUrl: string; current: boolean; collections: Promise<FolderLink[]> }) {
    const list = use(collections);
    const [creating, setCreating] = useState(false);
    return (
        <>
            <Dropdown.Root>
                <NavButton icon={Folder} label="Binders" current={current} />
                <Dropdown.Popover placement="right top" className="w-64">
                    <Dropdown.Menu>
                        <BinderItem href="/dashboard/collections" activeUrl={activeUrl} icon={Folder}>
                            All binders
                        </BinderItem>
                        <Dropdown.Separator />
                        <BinderItem href="/dashboard/favorites" activeUrl={activeUrl} icon={Star01}>
                            Favorites
                        </BinderItem>
                        <BinderItem href="/dashboard/pokedex" activeUrl={activeUrl} icon={Folder}>
                            Pokédex
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

function BinderItem({ href, activeUrl, icon, children }: { href: string; activeUrl: string; icon: FC<{ className?: string }>; children: ReactNode }) {
    return (
        <Dropdown.Item icon={icon} href={href} aria-current={activeUrl === href ? "page" : undefined}>
            {children}
        </Dropdown.Item>
    );
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
