import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { type CardFilter, getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";

// Every card you own: the whole collection as one list, a tab of its own beside Home.
//
// The list is not awaited: the title, the actions and the row go to the browser at once, and
// the first batch of cards, with the count and value under the title, follows when the API
// answers. The facets for the Filters menu are a cached read, five minutes per person.
export default async function CardsPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity, unpriced } = query;
    const filter: CardFilter = { q, sort, order, set, rarity, ...(unpriced ? { priced: false } : {}) };
    const narrowed = isNarrowed(query);
    const list = getMyCards(filter);
    const datapoints = list.then((r) => ({ total: r.total, narrowed, value: r.value, unpriced: r.unpriced }));
    // The facets ride with the list's first page: nothing else is read before the first byte.
    const facets = list.then((r) => r.facets);

    return (
        <FolderPage
            title="All cards"
            datapoints={datapoints}
            add={(compact) => <AddCardModal compact={compact} />}
            query={query}
            basePath="/dashboard/cards"
            facets={facets}
            list={list}
            filter={filter}
            empty={
                <AppEmptyState icon="plus" title="No cards yet" description="Add your first card to start your collection">
                    <AddCardModal />
                </AppEmptyState>
            }
        />
    );
}
