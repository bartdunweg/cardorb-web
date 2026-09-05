import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { type CardFilter, getFacets, getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";

// Cards you want but do not own. Outside the collection, so the API is asked for the wishes only.
// The list itself is not awaited: see cards/page.tsx.
export default async function WishlistPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity } = query;
    const filter: CardFilter = { wishlist: true, q, sort, order, set, rarity };
    const narrowed = isNarrowed(query);
    const list = getMyCards(filter);
    const datapoints = list.then((r) => ({ total: r.total, narrowed, value: r.value, unpriced: r.unpriced }));
    const facets = await getFacets();

    return (
        <FolderPage
            title="Wishlist"
            datapoints={datapoints}
            // Beside the title whatever the list holds: the title is drawn before the count is known.
            actions={<AddCardModal defaultTarget="wishlist" />}
            query={query}
            basePath="/dashboard/wishlist"
            facets={facets}
            list={list}
            filter={filter}
            empty={
                <AppEmptyState icon="heart" title="Your wishlist is empty" description="Add cards you’re looking for but don’t own yet">
                    {/* The words only: this node crosses to a client component, and an icon is a function. */}
                    <AddCardModal defaultTarget="wishlist" label="Add to wishlist" />
                </AppEmptyState>
            }
        />
    );
}
