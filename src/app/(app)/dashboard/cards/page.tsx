import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { type CardFilter, getFacets, getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";

// Every card you own: the folder that is the whole collection.
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
    const facets = await getFacets();

    return (
        <FolderPage
            title="All cards"
            back={{ href: "/dashboard/collections", label: "Collection" }}
            datapoints={datapoints}
            actions={
                <>
                    {/* A plus beside the title on a phone, the words from lg. */}
                    <div className="lg:hidden">
                        <AddCardModal compact />
                    </div>
                    <div className="max-lg:hidden">
                        <AddCardModal />
                    </div>
                </>
            }
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
