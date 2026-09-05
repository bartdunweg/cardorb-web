import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { ListSettingsDialog } from "@/components/app/list-settings-dialog";
import { type CardFilter, getFacets, getMyCards } from "@/lib/cards";
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
    const [facets, { profile }] = await Promise.all([getFacets(), getMyProfile()]);

    return (
        <FolderPage
            title="Wishlist"
            datapoints={datapoints}
            // Beside the title whatever the list holds: the title is drawn before the count is known.
            // A plus alone: the page says Wishlist, the button need not repeat it.
            actions={
                <>
                    <ListSettingsDialog list="wishlist" title="Wishlist" isPublic={profile?.wishlist_public ?? false} />
                    <AddCardModal defaultTarget="wishlist" compact />
                </>
            }
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
