import { CollectionsGrid } from "@/components/app/collections-grid";
import { PageHeader } from "@/components/app/page-header";
import { getMyCollections } from "@/lib/collections";

export default async function CollectionsPage() {
    const { collections, favoritesCount, wishlistCount } = await getMyCollections();

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader title="Collections" subtitle="Organize your cards into folders." />
            <CollectionsGrid collections={collections} favoritesCount={favoritesCount} wishlistCount={wishlistCount} />
        </div>
    );
}
