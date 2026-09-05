import { CollectionsGrid, NewCollectionButton } from "@/components/app/collections-grid";
import { PageHeader } from "@/components/app/page-header";
import { getFacets } from "@/lib/cards";
import { getMyCollections } from "@/lib/collections";

export default async function CollectionsPage() {
    const [{ collections, wishlistCount }, facets] = await Promise.all([getMyCollections(), getFacets()]);

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader title="Folders" subtitle="Group your cards the way you like." actions={<NewCollectionButton facets={facets} />} />
            <CollectionsGrid collections={collections} wishlistCount={wishlistCount} facets={facets} />
        </div>
    );
}
