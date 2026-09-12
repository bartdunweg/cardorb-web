"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { countCards } from "@/app/(app)/dashboard/list-actions";
import { type FilterGroup, type FilterValues, FiltersSheet } from "@/components/app/filters-sheet";
import { TypeIcon } from "@/components/app/type-icon";
import type { CardFilter } from "@/lib/cards";
import type { Facets } from "@/lib/cards";
import { type ListQuery, listHref } from "@/lib/list-query";

const FULL_ART = "fullArt";
const DUPLICATES = "duplicates";

/** The URL's filters from what the sheet chose. */
const patchOf = (v: FilterValues) => ({
    set: v.set ?? [],
    rarity: v.rarity ?? [],
    gen: v.gen ?? [],
    type: v.type ?? [],
    fullArt: (v.only ?? []).includes(FULL_ART),
    duplicates: (v.only ?? []).includes(DUPLICATES),
});

// A binder's filters, in the Filters sheet (a panel from the right on a wider screen): set, rarity,
// generation and type, each several at once, and "Show only" for the two that are yes or no. A
// filter the list has nothing for stays out: a collection of one era offers no era. The choices go
// into the URL on "Show", page back to one, and the server page asks the API, which matches a card
// that is any of a filter's values.
// `offerDuplicates`: a list of cards you own adds Duplicates, the printings held more than once. A
// wishlist or someone else's profile has no second copy to trade, so it offers none.
// `countBase`: the list the sheet narrows, so the button can say how many a draft finds. None on a
// public profile, whose reader has no session to ask with.
// `readOnly`: a public profile, whose route takes set and rarity and nothing else, so it offers
// only those two rather than filters that would change nothing.
export function CardsFilters({
    query,
    facets,
    offerDuplicates = false,
    countBase,
    readOnly = false,
}: {
    query: ListQuery;
    facets: Facets;
    offerDuplicates?: boolean;
    countBase?: CardFilter;
    readOnly?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const only = [
        ...(readOnly ? [] : [{ value: FULL_ART, label: "Full art" }]),
        ...(offerDuplicates || query.duplicates ? [{ value: DUPLICATES, label: "Duplicates", hint: "Held more than once" }] : []),
    ];
    const groups: FilterGroup[] = [
        // The set's official name, which the API's filter takes as well as the filed one.
        { id: "set", label: "Set", multiple: true, options: facets.sets.map((s) => ({ value: s.title, label: s.title })) },
        { id: "rarity", label: "Rarity", multiple: true, options: facets.rarities.map((r) => ({ value: r, label: r })) },
        ...(readOnly
            ? []
            : [
                  {
                      id: "gen",
                      label: "Generation",
                      multiple: true,
                      options: facets.gens.length > 1 || query.gen.length ? facets.gens.map((g) => ({ value: g, label: g })) : [],
                  },
                  {
                      id: "type",
                      label: "Type",
                      multiple: true,
                      options:
                          facets.types.length > 1 || query.type.length
                              ? facets.types.map((t) => ({ value: t, label: t, icon: <TypeIcon type={t} className="size-4" /> }))
                              : [],
                  },
              ]),
        /* Full art is not among the rarities, because it cuts across them: every special
           illustration rare is a full art, and so is a late Ultra Rare (`@/lib/full-art`). */
        { id: "only", label: "Show only", multiple: true, options: only },
    ];

    // A set chosen by the name a card was filed under reads as its title, the name the sheet offers.
    const setValues = query.set.map((name) => facets.sets.find((s) => s.name === name)?.title ?? name);
    const values: FilterValues = {
        set: setValues,
        rarity: query.rarity,
        gen: query.gen,
        type: query.type,
        only: [...(query.fullArt ? [FULL_ART] : []), ...(query.duplicates ? [DUPLICATES] : [])],
    };

    const count = useCallback(
        (draft: FilterValues) => {
            if (!countBase) return null;
            const p = patchOf(draft);
            return countCards({ ...countBase, ...p, fullArt: p.fullArt || undefined, duplicates: p.duplicates || undefined });
        },
        [countBase],
    );

    return (
        <FiltersSheet
            groups={groups}
            values={values}
            count={countBase ? count : undefined}
            noun={["card", "cards"]}
            onApply={(next) => router.replace(listHref(pathname, query, { ...patchOf(next), page: 1 }), { scroll: false })}
        />
    );
}
