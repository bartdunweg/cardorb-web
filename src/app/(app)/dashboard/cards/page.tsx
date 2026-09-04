import { Plus } from "@untitledui/icons";
import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsFilters } from "@/components/app/cards-filters";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsSearch } from "@/components/app/cards-search";
import { CardsSort } from "@/components/app/cards-sort";
import { CardsView } from "@/components/app/cards-view";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/base/buttons/button";
import { getMyCards } from "@/lib/cards";
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
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // No cards at all (and no active search) → empty state with the one action that gets you out of it.
    if (!narrowed && total === 0) {
        return (
            <AppEmptyState icon="plus" title="No cards yet" description="Add your first card to start your collection">
                <AddCardModal trigger={<Button iconLeading={Plus}>Add card</Button>} />
            </AppEmptyState>
        );
    }

    const pageHref = (n: number) => listHref("/dashboard/cards", query, { page: n });

    return (
        <div className="flex flex-1 flex-col gap-6">
            {/* The count is the header's line, as on every list page, so a search or filter shows its effect where the eye already is. */}
            <PageHeader
                title="All cards"
                subtitle={
                    narrowed
                        ? `${total.toLocaleString("en-US")} match${total === 1 ? "" : "es"}`
                        : `${total.toLocaleString("en-US")} card${total === 1 ? "" : "s"}`
                }
                actions={
                    <>
                        <CardsSort query={query} />
                        <AddCardModal />
                    </>
                }
            />

            <div className="flex flex-1 flex-col gap-4">
                {/* One row: search and the two filters; the sort sits in the header's actions. */}
                <div className="flex flex-wrap items-center gap-2">
                    <CardsSearch initialValue={q ?? ""} className="w-full sm:w-64" />
                    <CardsFilters query={query} facets={facets} />
                </div>

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
                        <CardsView cards={cards} />

                        <CardsPagination page={page} totalPages={totalPages} hrefFor={pageHref} />
                    </>
                )}
            </div>
        </div>
    );
}
