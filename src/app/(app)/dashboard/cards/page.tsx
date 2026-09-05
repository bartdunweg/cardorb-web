import { cookies } from "next/headers";
import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsFilters } from "@/components/app/cards-filters";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsSearch } from "@/components/app/cards-search";
import { CardsSort } from "@/components/app/cards-sort";
import { CardsView } from "@/components/app/cards-view";
import { CollectionViews } from "@/components/app/collection-views";
import { FiltersSheet } from "@/components/app/filters-sheet";
import { PageHeader } from "@/components/app/page-header";
import { getMyCards } from "@/lib/cards";
import { CARDS_VIEW_COOKIE, parseCardsView } from "@/lib/cards-view";
import { listHref, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

export default async function CardsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; sort?: string; set?: string; rarity?: string }>;
}) {
    const query = readListQuery(await searchParams);
    const { page, q, sort, order, set, rarity } = query;
    const narrowed = Boolean(q || set || rarity);
    // One read: the page carries the facets over the whole collection, so no second call for the menus.
    const { cards, total, facets } = await getMyCards({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q, sort, order, set, rarity });
    const view = parseCardsView((await cookies()).get(CARDS_VIEW_COOKIE)?.value);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const pageHref = (n: number) => listHref("/dashboard/cards", query, { page: n });

    // The count is the header's line, as on every list page, so a search or filter shows its effect
    // where the eye already is. The header stays on an empty collection too: it is the page's title,
    // and on a phone it carries the bar; the empty state below has the one action then.
    const empty = !narrowed && total === 0;
    const header = (
        <PageHeader
            title="All cards"
            above={<CollectionViews />}
            subtitle={
                narrowed ? `${total.toLocaleString("en-US")} match${total === 1 ? "" : "es"}` : `${total.toLocaleString("en-US")} card${total === 1 ? "" : "s"}`
            }
            actions={
                empty ? undefined : (
                    <>
                        {/* On a phone the sort sits in the filter row and Add card is a plus beside the title. */}
                        <CardsSort query={query} className="max-lg:hidden" />
                        <div className="lg:hidden">
                            <AddCardModal compact />
                        </div>
                        <div className="max-lg:hidden">
                            <AddCardModal />
                        </div>
                    </>
                )
            }
        />
    );

    // No cards at all (and no active search) → empty state with the one action that gets you out of it.
    if (empty) {
        return (
            <div className="flex flex-1 flex-col gap-6">
                {header}
                <AppEmptyState icon="plus" title="No cards yet" description="Add your first card to start your collection">
                    <AddCardModal />
                </AppEmptyState>
            </div>
        );
    }

    const toolbar = (
        <>
            <FiltersSheet key="filters" active={[q, query.set, query.rarity].filter(Boolean).length}>
                <CardsSearch key="search" initialValue={q ?? ""} className="w-full lg:w-64" />
                <CardsFilters key="filters" query={query} facets={facets} />
            </FiltersSheet>
            <CardsSort key="sort" query={query} className="lg:hidden" />
        </>
    );

    return (
        <div className="flex flex-1 flex-col gap-6">
            {header}

            <div className="flex flex-1 flex-col gap-4">
                {/* One row: search, the two filters and, when there is a list, the view toggle at the right end;
                    the sort sits in the header's actions. */}
                {total === 0 ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}

                {total === 0 ? (
                    <AppEmptyState
                        icon="search"
                        title="No cards found"
                        description={
                            q ? `No cards match “${q}”. Try a different name or set.` : "Nothing in that set or rarity. Clear a filter to widen the list."
                        }
                    />
                ) : (
                    <>
                        <CardsView cards={cards} initialView={view} toolbar={toolbar} />

                        <CardsPagination page={page} totalPages={totalPages} hrefFor={pageHref} />
                    </>
                )}
            </div>
        </div>
    );
}
