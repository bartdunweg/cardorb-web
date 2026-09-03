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
import { getFacets } from "@/lib/facets";
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
    const [{ cards, total }, facets] = await Promise.all([
        getMyCards({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q, sort, order, set, rarity }),
        getFacets(),
    ]);
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
            <PageHeader title="All cards" subtitle="Browse and filter your whole collection." />

            <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <CardsSearch initialValue={q ?? ""} />
                        {/* The count sits by the search, where a catalogue puts it, so a filter's effect is visible at once. */}
                        {total > 0 ? (
                            <p className="hidden shrink-0 text-sm text-tertiary tabular-nums sm:block">
                                {q ? `${total.toLocaleString("en-US")} match${total === 1 ? "" : "es"}` : `${total.toLocaleString("en-US")} cards`}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                        <CardsSort query={query} />
                        <AddCardModal />
                    </div>
                </div>
                <CardsFilters query={query} facets={facets} />

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
