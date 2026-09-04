import { cookies } from "next/headers";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsSort } from "@/components/app/cards-sort";
import { CardsView } from "@/components/app/cards-view";
import { PageHeader } from "@/components/app/page-header";
import { getMyCards } from "@/lib/cards";
import { CARDS_VIEW_COOKIE, parseCardsView } from "@/lib/cards-view";
import { listHref, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

// Starred cards you own. A favourite is a flag on a card in the collection (CLAUDE.md), so this asks the
// API for owned copies only; a wish cannot carry a star here.
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string }> }) {
    const query = readListQuery(await searchParams);
    const { page, sort, order } = query;
    const { cards, total } = await getMyCards({ favoritesOnly: true, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, sort, order });
    const view = parseCardsView((await cookies()).get(CARDS_VIEW_COOKIE)?.value);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (total === 0) {
        return <AppEmptyState icon="star" title="No favorites yet" description="Star a card to keep it here for quick access" />;
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Favorites"
                subtitle={`${total.toLocaleString("en-US")} starred card${total === 1 ? "" : "s"}`}
                back={{ href: "/dashboard/cards", label: "Cards" }}
                actions={<CardsSort query={query} />}
            />
            <CardsView cards={cards} initialView={view} />
            <CardsPagination page={page} totalPages={totalPages} hrefFor={(n) => listHref("/dashboard/favorites", query, { page: n })} />
        </div>
    );
}
