"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { countCards } from "@/app/(app)/dashboard/list-actions";
import { type FilterAnswer, type FilterGroup, type FilterOption, type FilterValues, FiltersSheet } from "@/components/app/filters-sheet";
import { FlagIcon } from "@/components/app/flag-icon";
import { TypeIcon } from "@/components/app/type-icon";
import { Dot } from "@/components/foundations/dot-icon";
import { FINISH_LABELS, type Finish } from "@/lib/api-shapes";
import type { CardFilter } from "@/lib/cards";
import type { Facets } from "@/lib/cards";
import { languageOf } from "@/lib/languages";
import { type ListQuery, listHref } from "@/lib/list-query";

const FULL_ART = "fullArt";
const DUPLICATES = "duplicates";

/**
 * A condition's dot, down Cardmarket's scale: the top two green, the middle yellow, the worn end
 * red. The word says it; the colour helps the eye run down the tags. One nobody scaled gets none.
 */
const CONDITION_DOT: Record<string, string> = {
    Mint: "text-fg-success-secondary",
    "Near Mint": "text-fg-success-secondary",
    Excellent: "text-fg-warning-secondary",
    Good: "text-fg-warning-secondary",
    "Light Played": "text-fg-warning-secondary",
    Played: "text-fg-error-secondary",
    Poor: "text-fg-error-secondary",
};

/**
 * The API's counts as the sheet reads them: per group, per option. Set, rarity, generation and type
 * come keyed as the options are; Full art and Duplicates are one number each, under "Show only".
 */
const answerFrom = (read: Awaited<ReturnType<typeof countCards>>): FilterAnswer | null => {
    if (!read) return null;
    const { counts } = read;
    if (!counts) return { total: read.total };
    const only: Record<string, number> = {};
    if (counts.fullArt !== undefined) only[FULL_ART] = counts.fullArt;
    if (counts.duplicates !== undefined) only[DUPLICATES] = counts.duplicates;
    return {
        total: read.total,
        options: {
            set: counts.set ?? {},
            rarity: counts.rarity ?? {},
            gen: counts.gen ?? {},
            type: counts.type ?? {},
            // An API before the copy filters sends none of these: no numbers then, rather than zeros.
            ...(counts.condition ? { condition: counts.condition } : {}),
            ...(counts.finish ? { finish: counts.finish } : {}),
            ...(counts.language ? { language: counts.language } : {}),
            only,
        },
    };
};

/**
 * The options, and any value chosen that the list no longer holds (a link from before, a copy since
 * sold) after them, so it can still be taken off one by one rather than only by Clear.
 */
const withChosen = (options: FilterOption[], chosen: string[], option: (value: string) => FilterOption): FilterOption[] => [
    ...options,
    ...chosen.filter((value) => !options.some((o) => o.value === value)).map(option),
];

/** The URL's filters from what the sheet chose. */
const patchOf = (v: FilterValues) => ({
    set: v.set ?? [],
    rarity: v.rarity ?? [],
    gen: v.gen ?? [],
    type: v.type ?? [],
    condition: v.condition ?? [],
    finish: v.finish ?? [],
    language: v.language ?? [],
    fullArt: (v.only ?? []).includes(FULL_ART),
    duplicates: (v.only ?? []).includes(DUPLICATES),
});

// A binder's filters, in the Filters sheet (a panel from the right on a wider screen): set, rarity,
// generation and type, then the copy's condition, finish and language, each several at once, and "Show only" for the two that are yes or no. A
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
    // A set chosen by the name a card was filed under reads as its title, the name the sheet offers.
    const setValues = query.set.map((name) => facets.sets.find((s) => s.name === name)?.title ?? name);
    const plain = (value: string): FilterOption => ({ value, label: value });
    const condition = (c: string): FilterOption => ({
        value: c,
        label: c,
        icon: CONDITION_DOT[c] ? <Dot size="md" aria-hidden="true" className={CONDITION_DOT[c]} /> : undefined,
    });
    const finish = (f: string): FilterOption => ({ value: f, label: FINISH_LABELS[f as Finish] ?? f });
    const language = (code: string): FilterOption => ({ value: code, label: languageOf(code).label, icon: <FlagIcon language={code} labelled /> });
    const type = (t: string): FilterOption => ({ value: t, label: t, icon: <TypeIcon type={t} className="size-4" /> });
    /** A filter of one value only is no choice: it stays out unless something in it is chosen. */
    const offered = (values: string[], chosen: string[], option: (value: string) => FilterOption) =>
        values.length > 1 || chosen.length ? withChosen(values.map(option), chosen, option) : [];

    const groups: FilterGroup[] = [
        // The set's official name, which the API's filter takes as well as the filed one.
        {
            id: "set",
            label: "Set",
            multiple: true,
            options: withChosen(
                facets.sets.map((s) => plain(s.title)),
                setValues,
                plain,
            ),
        },
        { id: "rarity", label: "Rarity", multiple: true, options: withChosen(facets.rarities.map(plain), query.rarity, plain) },
        ...(readOnly
            ? []
            : [
                  { id: "gen", label: "Generation", multiple: true, options: offered(facets.gens, query.gen, plain) },
                  { id: "type", label: "Type", multiple: true, options: offered(facets.types, query.type, type) },
                  // The copy rather than the card: what state it is in, its finish, the language it is printed in.
                  { id: "condition", label: "Condition", multiple: true, options: offered(facets.conditions, query.condition, condition) },
                  { id: "finish", label: "Finish", multiple: true, options: offered(facets.finishes, query.finish, finish) },
                  { id: "language", label: "Language", multiple: true, options: offered(facets.languages, query.language, language) },
              ]),
        /* Full art is not among the rarities, because it cuts across them: every special
           illustration rare is a full art, and so is a late Ultra Rare (`@/lib/full-art`). */
        { id: "only", label: "Show only", multiple: true, options: only },
    ];

    const values: FilterValues = {
        set: setValues,
        rarity: query.rarity,
        gen: query.gen,
        type: query.type,
        condition: query.condition,
        finish: query.finish,
        language: query.language,
        only: [...(query.fullArt ? [FULL_ART] : []), ...(query.duplicates ? [DUPLICATES] : [])],
    };

    const count = useCallback(
        (draft: FilterValues) => {
            if (!countBase) return null;
            const p = patchOf(draft);
            return countCards({ ...countBase, ...p, fullArt: p.fullArt || undefined, duplicates: p.duplicates || undefined }).then(answerFrom);
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
