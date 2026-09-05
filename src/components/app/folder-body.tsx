import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsFilters } from "@/components/app/cards-filters";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsSearch } from "@/components/app/cards-search";
import { CardsSort } from "@/components/app/cards-sort";
import { CardsView } from "@/components/app/cards-view";
import { DexView } from "@/components/app/dex-grid";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PublicCardsView } from "@/components/app/public-cards-view";
import type { Card, Facets, PublicCard } from "@/lib/cards";
import { CARDS_SIZE_COOKIE, CARDS_VIEW_COOKIE, parseCardsSize, parseCardsView } from "@/lib/cards-view";
import type { NamedDexSlot } from "@/lib/dex-groups";
import { type ListQuery, SORT_OPTIONS, type SortOption, isNarrowed, listHref } from "@/lib/list-query";

type Common = {
    query: ListQuery;
    /** Where the list lives, for page links. */
    basePath: string;
    facets: Facets;
    sortOptions?: readonly SortOption[];
    searchLabel?: string;
    searchPlaceholder?: string;
    total: number;
    pageSize?: number;
    /** The page's own "nothing here at all" state, with its way out. */
    empty: ReactNode;
    /** A folder shown as a Pokédex: the slots stand in for the list, and there are no pages. */
    pokedex?: { slots: NamedDexSlot[] };
};

export type FolderBodyProps = Common & ({ readOnly?: false; cards: Card[] } | { readOnly: true; cards: PublicCard[] });

// The lower half of every folder page: one row with the filters (a sheet on a phone), the sort
// and the View menu, then the list, the pages, or an empty state. The same on All cards, a folder,
// the favorites, the wishlist and a public profile, so a person learns the row once.
export async function FolderBody(props: FolderBodyProps) {
    const { query, basePath, facets, sortOptions = SORT_OPTIONS, searchLabel, searchPlaceholder, total, pageSize = 100, empty, pokedex } = props;
    const narrowed = isNarrowed(query);
    if (total === 0 && !narrowed) return <>{empty}</>;

    const jar = await cookies();
    const view = parseCardsView(jar.get(CARDS_VIEW_COOKIE)?.value);
    const size = parseCardsSize(jar.get(CARDS_SIZE_COOKIE)?.value);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const { q } = query;

    // The row: the search field, then three menu buttons, Filters, Sort and View. Search is the
    // thing you type, so it stays in the row; the set and rarity filters are a sheet.
    const toolbar = (
        <>
            <CardsSearch key="search" size="sm" initialValue={q ?? ""} label={searchLabel} placeholder={searchPlaceholder} className="w-full sm:w-64" />
            <FiltersSheet key="filters" active={[query.set, query.rarity].filter(Boolean).length}>
                <CardsFilters key="set-rarity" query={query} facets={facets} />
            </FiltersSheet>
            <CardsSort key="sort" query={query} options={sortOptions} />
        </>
    );

    if (total === 0) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
                <AppEmptyState
                    icon="search"
                    title="No cards found"
                    description={q ? `No cards match “${q}”. Try a different name or set.` : "Nothing in that set or rarity. Clear a filter to widen the list."}
                />
            </div>
        );
    }

    if (pokedex) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                <DexView slots={pokedex.slots} initialSize={size} toolbar={toolbar} />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-4">
            {props.readOnly ? (
                <PublicCardsView cards={props.cards} initialSize={size} toolbar={toolbar} />
            ) : (
                <CardsView cards={props.cards} initialView={view} initialSize={size} toolbar={toolbar} />
            )}
            <CardsPagination page={query.page} totalPages={totalPages} hrefFor={(n) => listHref(basePath, query, { page: n })} />
        </div>
    );
}
