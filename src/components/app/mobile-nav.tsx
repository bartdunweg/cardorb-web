"use client";

import { useEffect, useState } from "react";
import { Folder, Grid01, Heart, HomeLine, Rows01, SearchLg, Star01 } from "@untitledui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button as AriaButton } from "react-aria-components";
import { AccountMenuItems } from "@/components/app/account-menu";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Avatar } from "@/components/base/avatar/avatar";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { cx } from "@/utils/cx";

type Account = { name: string; email: string; avatarUrl: string | null };

const tabs = [
    { label: "Home", href: "/dashboard", icon: HomeLine, match: (p: string) => p === "/dashboard" },
    { label: "Cards", href: "/dashboard/cards", icon: Rows01, match: (p: string) => p.startsWith("/dashboard/cards") },
    { label: "Search", href: "/dashboard/search", icon: SearchLg, match: (p: string) => p.startsWith("/dashboard/search") },
    { label: "Collections", href: "/dashboard/collections", icon: Folder, match: (p: string) => p.startsWith("/dashboard/collections") },
];

// What the sidebar has and the four tabs do not. The More menu carries these, then the account's
// own entries, so nothing reachable on desktop is out of reach on a phone.
const more = [
    { label: "Pokédex", href: "/dashboard/pokedex", icon: Grid01 },
    { label: "Favorites", href: "/dashboard/favorites", icon: Star01 },
    { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
];

const tabClass = "flex flex-1 flex-col items-center gap-1 rounded-full py-1 text-xs/4 font-medium transition";

// Bottom tab bar for mobile: four destinations and the account, You, in one pill. Its side inset
// matches the content's padding, so bar and page share an edge.
export function MobileTabBar({ account }: { account: Account }) {
    const pathname = usePathname();
    const youActive = [...more.map((m) => m.href), "/dashboard/settings"].some((href) => pathname.startsWith(href));

    return (
        <nav
            aria-label="Primary"
            className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex items-stretch justify-around gap-1 rounded-full border border-glass glass p-0.5 shadow-lg sm:inset-x-6 lg:hidden"
        >
            {tabs.map((tab) => {
                const active = tab.match(pathname);
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        aria-current={active ? "page" : undefined}
                        className={cx(tabClass, active ? "bg-secondary text-primary" : "text-tertiary")}
                    >
                        <Icon className={cx("size-5", active ? "text-fg-primary" : "text-fg-quaternary")} />
                        {tab.label}
                    </Link>
                );
            })}
            <YouSheet account={account} active={youActive} />
        </nav>
    );
}

// The You tab opens a sheet that fills the screen, not a dropdown: on a phone the list is the page.
// It carries what the sidebar has and the tabs do not, then the account's own entries.
function YouSheet({ account, active }: { account: Account; active: boolean }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // A tap on an entry navigates; the sheet closes as the new page arrives.
    useEffect(() => setOpen(false), [pathname]);

    return (
        <DialogTrigger isOpen={open} onOpenChange={setOpen}>
            <AriaButton
                className={({ isFocusVisible }) =>
                    cx(
                        tabClass,
                        "cursor-pointer -outline-offset-2 outline-focus-ring",
                        active ? "bg-secondary text-primary" : "text-tertiary",
                        isFocusVisible && "outline-2",
                    )
                }
            >
                {/* The avatar sits in the icon's 20 px, so the You tab is as tall as the other four. */}
                <Avatar size="xs" src={account.avatarUrl ?? undefined} alt="" className="size-5" />
                You
            </AriaButton>
            <ModalOverlay isDismissable className="items-stretch bg-primary p-0 backdrop-blur-none sm:items-stretch sm:p-0">
                <Modal className="h-full max-sm:rounded-none">
                    <Dialog aria-label="You" className="h-full flex-col items-stretch justify-start">
                        {({ close }) => (
                            <>
                                <header className="flex h-12 items-center justify-between pr-2 pl-4 sm:pr-4 sm:pl-6">
                                    <h2 className="text-lg font-semibold text-primary">You</h2>
                                    <CloseButton label="Close" onClick={close} />
                                </header>
                                <div className="px-4 py-3 sm:px-6">
                                    <AvatarLabelGroup size="md" src={account.avatarUrl ?? undefined} alt="" title={account.name} subtitle={account.email} />
                                </div>
                                <Dropdown.Menu aria-label="You" className="px-2 sm:px-4">
                                    {more.map((item) => (
                                        <Dropdown.Item key={item.href} icon={item.icon} href={item.href}>
                                            {item.label}
                                        </Dropdown.Item>
                                    ))}
                                    <Dropdown.Separator />
                                    <AccountMenuItems />
                                </Dropdown.Menu>
                            </>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </DialogTrigger>
    );
}
