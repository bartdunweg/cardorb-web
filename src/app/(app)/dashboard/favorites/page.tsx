import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsView } from "@/components/app/cards-view";
import { getMyCards } from "@/lib/cards";

// Smart page: cards with is_favorite = true (owned or wishlist both count via getMyCards default).
export default async function FavoritesPage() {
    const { cards, total } = await getMyCards({ favoritesOnly: true, limit: 100 });

    if (cards.length === 0) {
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
            <CardsView cards={cards} />
        </div>
    );
}
