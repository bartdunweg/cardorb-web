import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsPagination } from "@/components/app/cards-pagination";
import { CardsSort } from "@/components/app/cards-sort";
import { CardsView } from "@/components/app/cards-view";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/base/buttons/button";
import { getMyCards } from "@/lib/cards";
import { listHref, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string }> }) {
    const query = readListQuery(await searchParams);
    const { page, sort, order } = query;
    const { cards, total } = await getMyCards({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, sort, order, wishlist: true });
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (total === 0) {
        return (
            <AppEmptyState icon="heart" title="Your wishlist is empty" description="Add cards you’re looking for but don’t own yet">
                <AddCardModal defaultTarget="wishlist" trigger={<Button>Add to wishlist</Button>} />
            </AppEmptyState>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Wishlist"
                subtitle={`${total.toLocaleString("en-US")} card${total === 1 ? "" : "s"} you want but don’t own yet`}
                back={{ href: "/dashboard/cards", label: "Cards" }}
                actions={
                    <>
                        <CardsSort query={query} />
                        <AddCardModal defaultTarget="wishlist" />
                    </>
                }
            />

            <CardsView cards={cards} />
            <CardsPagination page={page} totalPages={totalPages} hrefFor={(n) => listHref("/dashboard/wishlist", query, { page: n })} />
        </div>
    );
}
