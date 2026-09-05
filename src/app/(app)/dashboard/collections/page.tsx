import { CollectionsGrid, NewCollectionButton } from "@/components/app/collections-grid";
import { PageHeader } from "@/components/app/page-header";
import { getMyCollections } from "@/lib/collections";

export default async function CollectionsPage() {
    const { collections, favoritesCount, wishlistCount } = await getMyCollections();

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader title="Folders" subtitle="Group your cards the way you like." actions={<NewCollectionButton />} />
            <CollectionsGrid collections={collections} wishlistCount={wishlistCount} />
        </div>
    );
}
