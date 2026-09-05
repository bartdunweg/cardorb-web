import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

// Starred cards you own. A favourite is a flag on a card in the collection (CLAUDE.md), so this asks the
// API for owned copies only; a wish cannot carry a star here.
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { page, q, sort, order, set, rarity } = query;
    const { cards, total, facets, value, unpriced } = await getMyCards({
        favoritesOnly: true,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        q,
        sort,
        order,
        set,
        rarity,
    });

    return (
        <FolderPage
            title="Favorites"
            back={{ href: "/dashboard/collections", label: "Folders" }}
            datapoints={{ total, narrowed: isNarrowed(query), value, unpriced }}
            query={query}
            basePath="/dashboard/favorites"
            facets={facets}
            cards={cards}
            total={total}
            pageSize={PAGE_SIZE}
            empty={<AppEmptyState icon="star" title="No favorites yet" description="Star a card to keep it here for quick access" />}
        />
    );
}
