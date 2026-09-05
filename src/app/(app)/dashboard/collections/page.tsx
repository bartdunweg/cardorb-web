import { CollectionsGrid, NewCollectionButton } from "@/components/app/collections-grid";
import { PageHeader } from "@/components/app/page-header";
import { getFacets } from "@/lib/cards";
import { getMyCollections } from "@/lib/collections";

export default async function CollectionsPage() {
    const [{ collections, ownedCount, favoritesCount }, facets] = await Promise.all([getMyCollections(), getFacets()]);

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title="Collection"
                subtitle="Group your cards the way you like."
                actions={
                    <div className="max-lg:hidden">
                        <NewCollectionButton facets={facets} />
                    </div>
                }
                barActions={<NewCollectionButton facets={facets} compact />}
            />
            <CollectionsGrid collections={collections} ownedCount={ownedCount} favoritesCount={favoritesCount} facets={facets} />
        </div>
    );
}
