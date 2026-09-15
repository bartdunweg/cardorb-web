"use client";

import { type FC, Suspense, use, useEffect, useState } from "react";
import { Folder, LayoutLeft, Plus, SearchLg, Star01 } from "@untitledui/icons";
import Link from "next/link";
import { AccountMenu } from "@/components/app/account-menu";
import { useCommandSearch } from "@/components/app/command-search";
import { FolderModal } from "@/components/app/folder-dialog";
import { OrbLogo } from "@/components/app/orb-logo";
import { NavButton } from "@/components/application/app-navigation/base-components/nav-button";
import { cx } from "@/utils/cx";

type Account = { name: string; email: string; avatarUrl: string | null };
type FolderLink = { id: string; name: string; kind: "manual" | "rule"; count: number };
type RailItem = { label: string; href: string; icon: FC<{ className?: string }> };

/**
 * The sidebar folded: a rail of icons, each named by its tooltip, on the kit's slim sidebar's
 * shapes. Top to bottom the rows are the open sidebar's rows: the mark where the wordmark stands,
 * search where the search pill stands, then the four pages, then the binders, so nothing on the
 * rail sits at a different height from the row it replaces and folding moves no icon up or down.
 * The binders stand as they do open, one row each (Favorites, the ones you made, New binder), each
 * named by its tooltip, so a binder is one click away folded too (Bart's call, 2026-09-14).
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
                        <OrbLogo size={28} className="text-primary" />
                    </Link>
                </div>

                {/* The search pill's height when the sidebar is open (36 px since its "/" went), so the
                    four rows under it line up with the open sidebar's. */}
                <NavButton icon={SearchLg} label="Search" onPress={open} className="h-9 w-9" />
            </div>

            <ul className="flex flex-col px-4 pt-5">
                {items.map((item) => (
                    <li key={item.href} className="py-px">
                        <NavButton icon={item.icon} label={item.label} href={item.href} current={activeUrl === item.href} />
                    </li>
                ))}
                {/* Where the open sidebar heads its list with "Binders", the rail rules a line: a
                    section head is a word, and there is no room for one. */}
                {/* As tall as that head (pt-5 pb-1 around a 22 px line), so the binders under it sit
                    where they sit open. */}
                <li className="flex w-full flex-col px-0.5 pt-5 pb-1">
                    <div className="flex h-[22px] items-center">
                        <hr className="h-px w-full border-none bg-border-secondary" />
                    </div>
                </li>
                <li className="py-px">
                    <NavButton icon={Star01} label="Favorites" href="/dashboard/favorites" current={activeUrl === "/dashboard/favorites"} />
                </li>
                <Suspense fallback={null}>
                    <BinderRows activeUrl={activeUrl} collections={collections} />
                </Suspense>
                <li className="py-px">
                    <NewBinder />
                </li>
            </ul>

            {/* The foot the account card has when the sidebar is open, and the button that unfolds it
                above the avatar: at the head it would stand where the mark belongs. */}
            {/* pb-4.5 (18 px): the avatar's centre lands where the open card's avatar has it. */}
            <div className="mt-auto flex flex-col items-center gap-3 px-4 pt-4 pb-4.5">
                <NavButton icon={LayoutLeft} label="Expand sidebar" onPress={onExpand} className="size-8" />
                <Suspense fallback={null}>
                    <AccountSlot account={account} />
                </Suspense>
            </div>
        </>
    );
}

// Whether the binder rows have been on screen yet, in this tab. Folding or unfolding draws them anew,
// the open list or the rail's, and `arrive` then played again on rows that had not gone anywhere; they
// arrive once, when the read first lands, and stand still after.
let bindersShown = false;
export function useBindersArrive() {
    const [first] = useState(() => !bindersShown);
    useEffect(() => {
        bindersShown = true;
    }, []);
    return first;
}

// The binders you made, a row each, as they arrive.
function BinderRows({ activeUrl, collections }: { activeUrl: string; collections: Promise<FolderLink[]> }) {
    const arrive = useBindersArrive();
    return (
        <>
            {use(collections).map((c) => {
                const href = `/dashboard/collections/${c.id}`;
                return (
                    <li key={c.id} className={cx("py-px", arrive && "arrive")}>
                        <NavButton icon={Folder} label={c.name} href={href} current={activeUrl === href} />
                    </li>
                );
            })}
        </>
    );
}

// The open sidebar's New binder row, as an icon: it opens the same dialog.
function NewBinder() {
    const [creating, setCreating] = useState(false);
    return (
        <>
            <NavButton icon={Plus} label="New binder" onPress={() => setCreating(true)} />
            <FolderModal mode="create" isOpen={creating} onOpenChange={setCreating} />
        </>
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
