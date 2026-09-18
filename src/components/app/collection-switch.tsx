"use client";

import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";

const LISTS = [
    { id: "owned", label: "Owned", href: "/dashboard/cards" },
    { id: "wishlist", label: "Wishlist", href: "/dashboard/wishlist" },
] as const;

/**
 * Ours, from the kit's Tabs: the switch at the top of Collection and the wishlist, between the cards
 * you own and the cards you want. The wishlist lost its tab in the phone's bar to the round search
 * button beside it, and lives one tap into Collection (Bart's call, 2026-09-18). It stays a list of
 * its own at its own address: each tab is a link, so Back, a shared link and the list's remembered
 * filters work as they did, and the collection's counts still leave the wishlist out (R-DATA-002).
 */
export function CollectionSwitch({ current }: { current: (typeof LISTS)[number]["id"] }) {
    return (
        // Two halves of the column on a phone, as wide as their words from sm. Round, as every button in
        // the app is (button.tsx), where the kit's minimal tabs have its 8 px corner.
        <Tabs selectedKey={current} className="sm:w-max">
            <TabList aria-label="Collection" type="button-minimal" size="sm" fullWidth className="rounded-full">
                {LISTS.map((list) => (
                    <Tab key={list.id} id={list.id} href={list.href} label={list.label} className="justify-center rounded-full" />
                ))}
            </TabList>
        </Tabs>
    );
}
