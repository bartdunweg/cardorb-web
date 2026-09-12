"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import type { Facets } from "@/lib/cards";
import { FULL_ART } from "@/lib/full-art";
import { type ListQuery, listHref } from "@/lib/list-query";

// Four menus beside the search: set, rarity, generation, type, each with "All" on top. A choice
// goes into the URL (page back to one) and the server page asks the API, which matches each one
// whole. A menu the collection has nothing for stays out: a collection of one era offers no era.
// "Clear filters" shows only while one is on, so the row stays quiet otherwise. Renders its
// pieces into the caller's row (`display: contents`), so one row holds them all.
export function CardsFilters({ query, facets }: { query: ListQuery; facets: Facets }) {
    const router = useRouter();
    const pathname = usePathname();
    const go = (patch: Partial<Pick<ListQuery, "set" | "rarity" | "fullArt" | "gen" | "type">>) =>
        router.replace(listHref(pathname, query, { ...patch, page: 1 }), { scroll: false });
    const active = Boolean(query.set || query.rarity || query.fullArt || query.gen || query.type);

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
                /* Full art sits above the rarities and takes the place of one, because it is a
                   question of the same kind and because it cuts across them: one full art is an
                   Ultra Rare and the next an illustration rare (`@/lib/full-art`). The API works
                   it out per set and answers it; here it is one more thing the menu can say. */
                value={query.fullArt ? FULL_ART : (query.rarity ?? "")}
                onChange={(event) =>
                    go(event.target.value === FULL_ART ? { fullArt: true, rarity: undefined } : { fullArt: false, rarity: event.target.value || undefined })
                }
                options={[
                    { label: "All rarities", value: "" },
                    { label: "Full art", value: FULL_ART },
                    ...facets.rarities.map((r) => ({ label: r, value: r })),
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
            {active ? (
                <Button color="link-gray" size="sm" onClick={() => go({ set: undefined, rarity: undefined, fullArt: false, gen: undefined, type: undefined })}>
                    Clear filters
                </Button>
            ) : null}
        </div>
    );
}
