import { notFound } from "next/navigation";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsView } from "@/components/app/cards-view";
import { CollectionDetailActions } from "@/components/app/collection-detail-actions";
import { getMyCards } from "@/lib/cards";
import { getCollection } from "@/lib/collections";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const collection = await getCollection(id);
    if (!collection) notFound();

    const { cards, total } = await getMyCards({ collectionId: id, limit: 100 });

    return (
        <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="flex flex-col gap-1">
                    <h1 className="text-display-xs font-semibold text-primary">{collection.name}</h1>
                    <p className="text-md text-tertiary">
                        {total.toLocaleString("en-US")} card{total === 1 ? "" : "s"}
                    </p>
                </div>
                <CollectionDetailActions collectionId={id} />
            </div>

            {cards.length === 0 ? (
                <AppEmptyState icon="folder" title="No cards in this collection" description="Use “Add cards” to fill it." />
            ) : (
                <CardsView cards={cards} />
            )}
        </div>
    );
}
