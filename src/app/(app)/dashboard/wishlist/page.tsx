import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { ListSettingsDialog } from "@/components/app/list-settings-dialog";
import { type CardFilter, getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";
import { getMyProfile } from "@/lib/profile";

// Cards you want but do not own. Outside the collection, so the API is asked for the wishes only.
// The list itself is not awaited: see cards/page.tsx.
export default async function WishlistPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity, unpriced } = query;
    const filter: CardFilter = { wishlist: true, q, sort, order, set, rarity, ...(unpriced ? { priced: false } : {}) };
    const narrowed = isNarrowed(query);
    const list = getMyCards(filter);
    const datapoints = list.then((r) => ({ total: r.total, narrowed, value: r.value, unpriced: r.unpriced }));
    const { profile } = await getMyProfile();
    const facets = list.then((r) => r.facets);

    return (
        <FolderPage
            title="Wishlist"
            subtitle="Cards you’re looking for but don’t own yet."
            datapoints={datapoints}
            settings={(compact) => <ListSettingsDialog list="wishlist" title="Wishlist" isPublic={profile?.wishlist_public ?? false} compact={compact} />}
            add={(compact) => <AddCardModal defaultTarget="wishlist" compact={compact} />}
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
