"use client";

import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";

const LISTS = [
    { id: "owned", label: "Collection", href: "/dashboard/cards" },
    { id: "wishlist", label: "Wishlist", href: "/dashboard/wishlist" },
] as const;

/**
 * Ours, from the kit's underline Tabs: Collection | Wishlist under the title on a phone, the cards you have and the
 * ones you want. One tab in the phone's bar holds both, named My cards rather than Collection,
 * because the wishlist is not part of the collection; each page keeps its own title. From lg the
 * sidebar lists the two as pages of their own, so the switch is not drawn there (Bart's call,
 * 2026-09-18). Each half stays a list at its own address: each tab is a link, so Back, a shared
 * link and the list's remembered filters work as they did, and the collection's counts still leave
 * the wishlist out (R-DATA-002).
 */
export function CollectionSwitch({ current }: { current: (typeof LISTS)[number]["id"] }) {
    return (
        // The kit's underline tabs, as a set's page has them over its cards, each half of the line, under
        // the row of filters and over the list, 44 px high where the kit's is 30 (Bart's call, 2026-09-19).
        <Tabs selectedKey={current}>
            <TabList aria-label="My cards" type="underline" size="sm" fullWidth>
                {LISTS.map((list) => (
                    <Tab key={list.id} id={list.id} href={list.href} label={list.label} className="flex-1 justify-center py-3" />
                ))}
            </TabList>
        </Tabs>
    );
}
