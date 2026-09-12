"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Facets } from "@/lib/cards";
import { FULL_ART } from "@/lib/full-art";
import { type ListQuery, listHref } from "@/lib/list-query";

// The menus beside the search: set, rarity, art, generation, type, each with "All" on top. A choice
// goes into the URL (page back to one) and the server page asks the API, which matches each one
// whole. A menu the collection has nothing for stays out: a collection of one era offers no era.
// "Clear filters" shows only while one is on, so the row stays quiet otherwise. Renders its
// pieces into the caller's row (`display: contents`), so one row holds them all.
// `offerDuplicates`: a list of cards you own adds Copies, the printings held more than once. A
// wishlist or someone else's profile has no second copy to trade, so it offers none.
export function CardsFilters({ query, facets, offerDuplicates = false }: { query: ListQuery; facets: Facets; offerDuplicates?: boolean }) {
    const router = useRouter();
    const pathname = usePathname();
    const go = (patch: Partial<Pick<ListQuery, "set" | "rarity" | "fullArt" | "gen" | "type" | "duplicates">>) =>
        router.replace(listHref(pathname, query, { ...patch, page: 1 }), { scroll: false });
    const active = Boolean(query.set || query.rarity || query.fullArt || query.gen || query.type || query.duplicates);

    return (
        <div className="contents">
            <NativeSelect
                aria-label="Set"
                size="sm"
                className="w-auto max-w-64"
                value={facets.sets.find((s) => s.title === query.set || s.name === query.set)?.title ?? query.set ?? ""}
                onChange={(event) => go({ set: event.target.value || undefined })}
                // The set's official name, which the API's filter takes as well as the filed one.
                options={[{ label: "All sets", value: "" }, ...facets.sets.map((s) => ({ label: s.title, value: s.title }))]}
            />
            <NativeSelect
                aria-label="Rarity"
                size="sm"
                className="w-auto"
                value={query.rarity ?? ""}
                onChange={(event) => go({ rarity: event.target.value || undefined })}
                options={[{ label: "All rarities", value: "" }, ...facets.rarities.map((r) => ({ label: r, value: r }))]}
            />
            {/* Full art is a menu of its own and not an entry among the rarities, because it cuts
                across them: every special illustration rare is a full art, and so is a late Ultra
                Rare (`@/lib/full-art`). Listed with the rarities it put one card under two of
                them. On its own it combines with a rarity, which the API answers together. */}
            <NativeSelect
                aria-label="Art"
                size="sm"
                className="w-auto"
                value={query.fullArt ? FULL_ART : ""}
                onChange={(event) => go({ fullArt: event.target.value === FULL_ART })}
                options={[
                    { label: "Any art", value: "" },
                    { label: "Full art", value: FULL_ART },
                ]}
            />
            {facets.gens.length > 1 || query.gen ? (
                <NativeSelect
                    aria-label="Generation"
                    size="sm"
                    className="w-auto"
                    value={query.gen ?? ""}
                    onChange={(event) => go({ gen: event.target.value || undefined })}
                    options={[{ label: "All generations", value: "" }, ...facets.gens.map((g) => ({ label: g, value: g }))]}
                />
            ) : null}
            {facets.types.length > 1 || query.type ? (
                <NativeSelect
                    aria-label="Type"
                    size="sm"
                    className="w-auto"
                    value={query.type ?? ""}
                    onChange={(event) => go({ type: event.target.value || undefined })}
                    options={[{ label: "All types", value: "" }, ...facets.types.map((t) => ({ label: t, value: t }))]}
                />
            ) : null}
            {offerDuplicates || query.duplicates ? (
                <NativeSelect
                    aria-label="Copies"
                    size="sm"
                    className="w-auto"
                    value={query.duplicates ? "duplicates" : ""}
                    onChange={(event) => go({ duplicates: event.target.value === "duplicates" })}
                    options={[
                        { label: "All copies", value: "" },
                        { label: "Duplicates", value: "duplicates" },
                    ]}
                />
            ) : null}
            {active ? (
                <Button
                    color="link-gray"
                    size="sm"
                    onClick={() => go({ set: undefined, rarity: undefined, fullArt: false, gen: undefined, type: undefined, duplicates: false })}
                >
                    Clear filters
                </Button>
            ) : null}
        </div>
    );
}
