import { CollectionsGrid, NewCollectionButton } from "@/components/app/collections-grid";
import { PageHeader } from "@/components/app/page-header";
import { getMyCollections } from "@/lib/collections";

export default async function CollectionsPage() {
    const { collections, ownedCount, favoritesCount } = await getMyCollections();

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title="Collection"
                subtitle="Group your cards the way you like."
                actions={
                    <div className="max-lg:hidden">
                        <NewCollectionButton />
                    </div>
                }
                barActions={<NewCollectionButton compact />}
            />
            <CollectionsGrid collections={collections} ownedCount={ownedCount} favoritesCount={favoritesCount} />
        </div>
    );
}
