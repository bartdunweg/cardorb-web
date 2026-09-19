import { Suspense } from "react";
import type { ReactNode } from "react";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsFilters } from "@/components/app/cards-filters";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsPeriod } from "@/components/app/cards-period";
import { CardsSearch } from "@/components/app/cards-search";
import { CardsSort } from "@/components/app/cards-sort";
import { CardsView } from "@/components/app/cards-view";
import { DexView } from "@/components/app/dex-grid";
import { PublicCardsView } from "@/components/app/public-cards-view";
import { FILTER_BAR, type SearchPlace } from "@/components/app/row-search";
import type { CardFilter, CardList, PublicCard } from "@/lib/cards";
import type { DexList } from "@/lib/dex-groups";
import type { Facets } from "@/lib/facets";
import { rememberedView } from "@/lib/list-memory-server";
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
    /** The field's name and placeholder: "Search in" and the list's own name. */
    searchLabel?: string;
    /** The page's own "nothing here at all" state, with its way out. */
    empty: ReactNode;
    /** Sibling lists this page switches between (Collection | Wishlist), under the row, below lg. */
    views?: ReactNode;
    /** Where the phone's search is (`RowSearch`): always in the bar on a page the tab bar reaches, behind a button on one with Back. */
    searchPlace?: SearchPlace;
};

/** A public profile: the cards came with the page, and it pages by URL. */
type PublicBody = Common & { readOnly: true } & (
        | { cards: PublicCard[]; total: number; pageSize?: number; pokedex?: undefined }
        | { cards?: undefined; total?: undefined; pageSize?: undefined; pokedex: { dex: Promise<DexList> } }
    );

/**
 * Your own binder: the first batch is a promise the page handed over without waiting, so the
 * row is on screen while the API answers; the rest comes as you scroll, asked for with `filter`.
 * As a Pokédex, the slots stand in for the list.
 */
type OwnBody = Common & { readOnly?: false; filter: CardFilter } & (
        { list: Promise<CardList>; pokedex?: undefined } | { list?: undefined; pokedex: { dex: Promise<DexList> } }
    );

export type BinderBodyProps = PublicBody | OwnBody;

// The lower half of every binder page: one row with the filters (a sheet on a phone), the sort
// and the View menu, then the list, or an empty state. The same on All cards, a binder, the
// favorites, the wishlist and a public profile, so a person learns the row once.
export async function BinderBody(props: BinderBodyProps) {
    const { query, basePath, facets, sortOptions = SORT_OPTIONS, defaultSortKey = "set", searchLabel, empty } = props;
    const narrowed = isNarrowed(query);
    const { q } = query;
    // Your own cards, not wishes: the only lists with a second copy of anything.
    const offerDuplicates = !props.readOnly && !props.filter.wishlist;

    // The View menu as this page was left (list-memory.ts): its own, not the app's.
    const { view, size, group } = await rememberedView(basePath);

    // The row: the search field, then three menu buttons, Filters, Sort and View. Search is the
    // thing you type, so it stays in the row; the set and rarity filters are a sheet.
    // Sort, and beside it the period a change sort reads over while that sort is on.
    const sorting = (
        <>
            <CardsSort query={query} options={sortOptions} defaultSortKey={defaultSortKey} />
            {query.sort === "change" ? <CardsPeriod query={query} defaultSortKey={defaultSortKey} /> : null}
        </>
    );
    const toolbar = (
        <>
            {/* The whole first line on a phone, the buttons under it; a short field from sm (`RowSearch`). */}
            <CardsSearch
                key="search"
                size="sm"
                initialValue={q ?? ""}
                label={searchLabel}
                // Your own lists have a bar on a phone: the field in it, or a button there on a page with Back. A public profile has none.
                place={props.readOnly ? "row" : (props.searchPlace ?? "button")}
                // The titles it offers are the ones in this very list, filters and all. A public
                // profile gets none: the suggestion would be read from the reader's own cards.
                scope={
                    props.readOnly
                        ? undefined
                        : {
                              collectionId: props.filter.collectionId,
                              wishlist: props.filter.wishlist,
                              favoritesOnly: props.filter.favoritesOnly,
                              set: query.set,
                              rarity: query.rarity,
                          }
                }
            />
            {/* On a phone the line under the search, scrolling sideways; from sm its buttons stand in the row.
                The facets as the promise, not behind a Suspense boundary with Filters as its fallback:
                the fallback's button and sheet were swapped for new ones when the facets came in, so a
                sheet opened in between closed under the finger (use-arrived.ts). */}
            <div key="bar" className={FILTER_BAR}>
                <CardsFilters
                    key="filters"
                    query={query}
                    facets={facets}
                    offerDuplicates={offerDuplicates}
                    readOnly={props.readOnly}
                    countBase={props.readOnly ? undefined : props.filter}
                    // A phone's bar reads Filters, Sort, then each filter: Sort goes in between there.
                    lead={sorting}
                />
                <div key="sort" className="contents max-sm:hidden">
                    {sorting}
                </div>
            </div>
        </>
    );

    // A search that finds nothing keeps the row where it was: the view draws this in the list's
    // place, so the search field is not remounted (and its caret lost) on the way to zero and back.
    const noHits = (
        <AppEmptyState
            icon="search"
            title="No cards found"
            // Any filter, not only a set or a rarity: duplicates, full art, type and the rest empty a list too.
            description={
                q
                    ? `No cards match “${q}” with these filters. Try a different name, or clear a filter.`
                    : "Nothing matches these filters. Clear a filter to see more."
            }
        />
    );

    if (props.readOnly && props.pokedex) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                <DexView
                    listKey={listHref(basePath, query, {})}
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

    // The list's URL. What it keys is the list itself, never the row above it: keying the view
    // rebuilt the search field on every committed keystroke and the caret went with it.
    const key = listHref(basePath, query, {});

    if (props.pokedex) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                <DexView
                    listKey={key}
                    dex={props.pokedex.dex}
                    narrowed={narrowed}
                    initialSize={size}
                    toolbar={toolbar}
                    noHits={noHits}
                    empty={empty}
                    viewInBar
                />
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
                listKey={key}
                list={props.list}
                filter={props.filter}
                narrowed={narrowed}
                // "Set" asks the API for nothing: its own order is set by set, newest first, number
                // by number. That grouping was on screen and invisible, so the list read as unsorted
                // and the menu as broken. The headings are the grouping, said out loud.
                sortedBySet={query.sortKey === "set"}
                // Sorted by price change: a card opened from the list reads its own line over the
                // same days the list ranked it by. Custom dates have no button on the chart.
                period={query.sort === "change" && query.period !== "custom" ? query.period : undefined}
                initialGroup={group}
                initialView={view}
                initialSize={size}
                toolbar={toolbar}
                noHits={noHits}
                empty={empty}
                viewInBar
                views={props.views}
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
