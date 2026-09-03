import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsSort } from "@/components/app/cards-sort";
import { CardsView } from "@/components/app/cards-view";
import { getMyCards } from "@/lib/cards";
import { listHref, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

// Smart page: cards with is_favorite = true (owned or wishlist both count via getMyCards default).
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string }> }) {
    const query = readListQuery(await searchParams);
    const { page, sort, order } = query;
    const { cards, total } = await getMyCards({ favoritesOnly: true, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, sort, order });
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (total === 0) {
        return <AppEmptyState icon="star" title="No favorites yet" description="Star a card to keep it here for quick access." />;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-xs font-semibold text-primary">Favorites</h1>
                <p className="text-md text-tertiary">
                    {total.toLocaleString("en-US")} starred card{total === 1 ? "" : "s"}
                </p>
            </div>
            <div className="flex justify-end">
                <CardsSort query={query} />
            </div>
            <CardsView cards={cards} />
            <CardsPagination page={page} totalPages={totalPages} hrefFor={(n) => (n > 1 ? `/dashboard/favorites?page=${n}` : "/dashboard/favorites")} />
        </div>
    );
}
