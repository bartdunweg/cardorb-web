import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsView } from "@/components/app/cards-view";
import { Button } from "@/components/base/buttons/button";
import { getMyCards } from "@/lib/cards";

export default async function WishlistPage() {
    const { cards, total } = await getMyCards({ limit: 100, wishlist: true });

    if (cards.length === 0) {
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
                <p className="text-sm text-tertiary">
                    {total.toLocaleString("en-US")} card{total === 1 ? "" : "s"}
                </p>
            </div>
        </div>
    );
}
