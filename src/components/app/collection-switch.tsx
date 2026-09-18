"use client";

import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";

const LISTS = [
    { id: "owned", label: "Owned", href: "/dashboard/cards" },
    { id: "wishlist", label: "Wishlist", href: "/dashboard/wishlist" },
] as const;

/**
 * Ours, from the kit's Tabs: Owned | Wishlist under the title on a phone, the cards you have and the
 * ones you want. One tab in the phone's bar holds both, named My cards rather than Collection,
 * because the wishlist is not part of the collection; each page keeps its own title. From lg the
 * sidebar lists the two as pages of their own, so the switch is not drawn there (Bart's call,
 * 2026-09-18). Each half stays a list at its own address: each tab is a link, so Back, a shared
 * link and the list's remembered filters work as they did, and the collection's counts still leave
 * the wishlist out (R-DATA-002).
 */
export function CollectionSwitch({ current }: { current: (typeof LISTS)[number]["id"] }) {
    return (
        // Two halves of the column on a phone, as wide as their words from sm (beside the title from lg). Round, as every button in
        // the app is (button.tsx), where the kit's minimal tabs have its 8 px corner.
        <Tabs selectedKey={current} className="sm:w-max">
            <TabList aria-label="My cards" type="button-minimal" size="sm" fullWidth className="rounded-full">
                {LISTS.map((list) => (
                    <Tab key={list.id} id={list.id} href={list.href} label={list.label} className="justify-center rounded-full" />
                ))}
            </TabList>
        </Tabs>
    );
}
