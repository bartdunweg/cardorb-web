import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsPagination, pageFromParam } from "@/components/app/cards-pagination";
import { CardsView } from "@/components/app/cards-view";
import { Button } from "@/components/base/buttons/button";
import { getMyCards } from "@/lib/cards";

const PAGE_SIZE = 100;

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const page = pageFromParam((await searchParams).page);
    const { cards, total } = await getMyCards({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, wishlist: true });
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (total === 0) {
        return (
            <AppEmptyState icon="heart" title="Your wishlist is empty" description="Add cards you’re looking for but don’t own yet.">
                <AddCardModal defaultTarget="wishlist" trigger={<Button>Add to wishlist</Button>} />
            </AppEmptyState>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                    <h1 className="text-display-xs font-semibold text-primary">Wishlist</h1>
                    <p className="text-md text-tertiary">Cards you want but don’t own yet.</p>
                </div>
                <AddCardModal defaultTarget="wishlist" />
            </div>

            <div className="flex flex-col gap-4">
                <CardsView cards={cards} />
                <div className="flex flex-col gap-3">
                    <p className="text-sm text-tertiary">
                        {total.toLocaleString("en-US")} card{total === 1 ? "" : "s"}
                    </p>
                    <CardsPagination page={page} totalPages={totalPages} hrefFor={(n) => (n > 1 ? `/dashboard/wishlist?page=${n}` : "/dashboard/wishlist")} />
                </div>
            </div>
        </div>
    );
}
