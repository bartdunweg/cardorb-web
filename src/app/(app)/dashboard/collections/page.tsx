import { CollectionsGrid } from "@/components/app/collections-grid";
import { getMyCollections } from "@/lib/collections";

export default async function CollectionsPage() {
    const { collections, favoritesCount, wishlistCount } = await getMyCollections();

    return (
        <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-xs font-semibold text-primary">Collections</h1>
                <p className="text-md text-tertiary">Organize your cards into folders.</p>
            </div>
            <CollectionsGrid collections={collections} favoritesCount={favoritesCount} wishlistCount={wishlistCount} />
        </div>
    );
}
