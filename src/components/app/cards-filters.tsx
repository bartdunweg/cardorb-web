"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Facets } from "@/lib/cards";
import { type ListQuery, listHref } from "@/lib/list-query";

// Two menus beside the search: one set, one rarity, each with "All" on top. A choice goes into
// the URL (page back to one) and the server page asks the API; the API matches a set or a
// rarity whole. "Clear filters" shows only while one is on, so the row stays quiet otherwise.
// Renders its pieces into the caller's row (`display: contents`), so one row holds them all.
export function CardsFilters({ query, facets }: { query: ListQuery; facets: Facets }) {
    const router = useRouter();
    const pathname = usePathname();
    const go = (patch: Partial<Pick<ListQuery, "set" | "rarity">>) => router.replace(listHref(pathname, query, { ...patch, page: 1 }), { scroll: false });
    const active = Boolean(query.set || query.rarity);

    return (
        <div className="contents">
            <NativeSelect
                aria-label="Set"
                size="sm"
                className="w-auto max-w-64"
                value={query.set ?? ""}
                onChange={(event) => go({ set: event.target.value || undefined })}
                options={[{ label: "All sets", value: "" }, ...facets.sets.map((s) => ({ label: s.title, value: s.name }))]}
            />
            <NativeSelect
                aria-label="Rarity"
                size="sm"
                className="w-auto"
                value={query.rarity ?? ""}
                onChange={(event) => go({ rarity: event.target.value || undefined })}
                options={[{ label: "All rarities", value: "" }, ...facets.rarities.map((r) => ({ label: r, value: r }))]}
            />
            {active ? (
                <Button color="link-gray" size="sm" onClick={() => go({ set: undefined, rarity: undefined })}>
                    Clear filters
                </Button>
            ) : null}
        </div>
    );
}
