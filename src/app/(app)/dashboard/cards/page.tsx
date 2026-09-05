import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

// Every card you own: the folder that is the whole collection.
export default async function CardsPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { page, q, sort, order, set, rarity } = query;
    const { cards, total, facets } = await getMyCards({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q, sort, order, set, rarity });
    const empty = total === 0 && !isNarrowed(query);

    return (
        <FolderPage
            title="All cards"
            back={{ href: "/dashboard/collections", label: "Folders" }}
            datapoints={{ total, narrowed: isNarrowed(query) }}
            actions={
                empty ? undefined : (
                    <>
                        {/* A plus beside the title on a phone, the words from lg. */}
                        <div className="lg:hidden">
                            <AddCardModal compact />
                        </div>
                        <div className="max-lg:hidden">
                            <AddCardModal />
                        </div>
                    </>
                )
            }
            query={query}
            basePath="/dashboard/cards"
            facets={facets}
            cards={cards}
            total={total}
            pageSize={PAGE_SIZE}
            empty={
                <AppEmptyState icon="plus" title="No cards yet" description="Add your first card to start your collection">
                    <AddCardModal />
                </AppEmptyState>
            }
        />
    );
}
