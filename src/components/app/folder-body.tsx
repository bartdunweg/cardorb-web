import { Suspense } from "react";
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
import type { CardFilter, CardList, PublicCard } from "@/lib/cards";
import { CARDS_SIZE_COOKIE, CARDS_VIEW_COOKIE, parseCardsSize, parseCardsView } from "@/lib/cards-view";
import type { DexList } from "@/lib/dex-groups";
import { type Facets, NO_FACETS } from "@/lib/facets";
import { type ListQuery, SORT_OPTIONS, type SortKey, type SortOption, isNarrowed, listHref } from "@/lib/list-query";

type Common = {
    query: ListQuery;
    /** The sort a bare URL means here: set order on your own lists, newest first on a public profile. */
    defaultSortKey?: SortKey;
    /** Where the list lives, for page links. */
    basePath: string;
    /** The sets and rarities for the Filters sheet; a promise when they come with the list itself. */
    facets: Facets | Promise<Facets>;
    sortOptions?: readonly SortOption[];
    searchLabel?: string;
    searchPlaceholder?: string;
    /** The page's own "nothing here at all" state, with its way out. */
    empty: ReactNode;
};

/** A public profile: the cards came with the page, and it pages by URL. */
type PublicBody = Common & { readOnly: true } & (
        | { cards: PublicCard[]; total: number; pageSize?: number; pokedex?: undefined }
        | { cards?: undefined; total?: undefined; pageSize?: undefined; pokedex: { dex: Promise<DexList> } }
    );

/**
 * Your own folder: the first batch is a promise the page handed over without waiting, so the
 * row is on screen while the API answers; the rest comes as you scroll, asked for with `filter`.
 * As a Pokédex, the slots stand in for the list.
 */
type OwnBody = Common & { readOnly?: false; filter: CardFilter } & (
        { list: Promise<CardList>; pokedex?: undefined } | { list?: undefined; pokedex: { dex: Promise<DexList> } }
    );

export type FolderBodyProps = PublicBody | OwnBody;

// The lower half of every folder page: one row with the filters (a sheet on a phone), the sort
// and the View menu, then the list, or an empty state. The same on All cards, a folder, the
// favorites, the wishlist and a public profile, so a person learns the row once.
export async function FolderBody(props: FolderBodyProps) {
    const { query, basePath, facets, sortOptions = SORT_OPTIONS, defaultSortKey = "set", searchLabel, searchPlaceholder, empty } = props;
    const narrowed = isNarrowed(query);
    const { q } = query;

    const jar = await cookies();
    const view = parseCardsView(jar.get(CARDS_VIEW_COOKIE)?.value);
    const size = parseCardsSize(jar.get(CARDS_SIZE_COOKIE)?.value);

    // The row: the search field, then three menu buttons, Filters, Sort and View. Search is the
    // thing you type, so it stays in the row; the set and rarity filters are a sheet.
    const toolbar = (
        <>
            {/* The field takes what the three buttons leave, so the row is one line at every width; on a
                phone the buttons are their icons alone to leave it enough. */}
            <CardsSearch
                key="search"
                size="sm"
                initialValue={q ?? ""}
                label={searchLabel}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 sm:max-w-64"
            />
            <FiltersSheet key="filters" active={[query.set, query.rarity].filter(Boolean).length}>
                <Suspense key="set-rarity" fallback={<CardsFilters query={query} facets={NO_FACETS} />}>
                    <FiltersWhenReady query={query} facets={facets} />
                </Suspense>
            </FiltersSheet>
            <CardsSort key="sort" query={query} options={sortOptions} defaultSortKey={defaultSortKey} />
        </>
    );

    // A search that finds nothing keeps the row where it was: the view draws this in the list's
    // place, so the search field is not remounted (and its caret lost) on the way to zero and back.
    const noHits = (
        <AppEmptyState
            icon="search"
            title="No cards found"
            description={q ? `No cards match “${q}”. Try a different name or set.` : "Nothing in that set or rarity. Clear a filter to widen the list."}
        />
    );

    if (props.readOnly && props.pokedex) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                <DexView
                    key={listHref(basePath, query, {})}
                    dex={props.pokedex.dex}
                    narrowed={narrowed}
                    initialSize={size}
                    toolbar={toolbar}
                    noHits={noHits}
                    empty={empty}
                    linked={false}
                />
            </div>
        );
    }

    if (props.readOnly) {
        const { cards, total, pageSize = 100 } = props;
        // In a column that grows: the empty state takes the room under the chips and, on a tall
        // viewport, sits in the middle of it rather than against the row above.
        if (total === 0 && !narrowed) return <div className="flex flex-1 flex-col">{empty}</div>;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        return (
            <div className="flex flex-1 flex-col gap-4">
                <PublicCardsView cards={cards} initialSize={size} toolbar={toolbar} empty={total === 0 ? noHits : null} />
                {total > 0 ? (
                    <CardsPagination page={query.page} totalPages={totalPages} hrefFor={(n) => listHref(basePath, query, { page: n }, defaultSortKey)} />
                ) : null}
            </div>
        );
    }

    // Keyed on the list's URL: a new search or sort is a new list, with its own first batch and
    // nothing scrolled-to from the last one.
    const key = listHref(basePath, query, {});

    if (props.pokedex) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                <DexView key={key} dex={props.pokedex.dex} narrowed={narrowed} initialSize={size} toolbar={toolbar} noHits={noHits} empty={empty} />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-4">
            {/* The catalogue is a source, not the collection: when it is unreachable the rows are still
                yours, without their scans and prices. Said once, over the list, rather than left to look
                like a broken page. */}
            <Suspense fallback={null}>
                <CatalogueNotice list={props.list} />
            </Suspense>
            <CardsView
                key={key}
                list={props.list}
                filter={props.filter}
                narrowed={narrowed}
                initialView={view}
                initialSize={size}
                toolbar={toolbar}
                noHits={noHits}
                empty={empty}
            />
        </div>
    );
}

async function CatalogueNotice({ list }: { list: Promise<CardList> }) {
    if (!(await list).catalogueUnavailable) return null;
    return (
        <output className="arrive rounded-lg bg-secondary px-4 py-3 text-sm text-secondary">
            The card catalogue is not answering, so these cards have no pictures or prices right now. Your collection is unchanged; try again in a minute.
        </output>
    );
}

// The Filters sheet's fields once the sets and rarities are known: they ride with the list's first
// page, so a page no longer waits for a second read before its first byte.
async function FiltersWhenReady({ query, facets }: { query: ListQuery; facets: Facets | Promise<Facets> }) {
    return <CardsFilters query={query} facets={await facets} />;
}
