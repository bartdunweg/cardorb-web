import type { Metadata } from "next";
import { CollectionsGrid, NewCollectionButton } from "@/components/app/collections-grid";
import { PageHeader } from "@/components/app/page-header";
import { getMyCollections } from "@/lib/collections";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Binders" };

export default async function CollectionsPage() {
    const { collections, favoritesCount } = await getMyCollections();

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title="Binders"
                actions={
                    <div className="max-lg:hidden">
                        <NewCollectionButton />
                    </div>
                }
                barActions={<NewCollectionButton compact />}
            />
            <CollectionsGrid collections={collections} favoritesCount={favoritesCount} />
        </div>
    );
}
