import { Plus } from "@untitledui/icons";
import { AddCardModal } from "@/components/app/add-card-modal";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { Button } from "@/components/base/buttons/button";
import { getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";

const PAGE_SIZE = 100;

// Cards you want but do not own. Outside the collection, so the API is asked for the wishes only.
export default async function WishlistPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { page, q, sort, order, set, rarity } = query;
    const { cards, total, facets } = await getMyCards({ wishlist: true, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, q, sort, order, set, rarity });
    const empty = total === 0 && !isNarrowed(query);

    return (
        <FolderPage
            title="Wishlist"
            datapoints={{ total, narrowed: isNarrowed(query) }}
            actions={empty ? undefined : <AddCardModal defaultTarget="wishlist" />}
            query={query}
            basePath="/dashboard/wishlist"
            facets={facets}
            cards={cards}
            total={total}
            pageSize={PAGE_SIZE}
            empty={
                <AppEmptyState icon="heart" title="Your wishlist is empty" description="Add cards you’re looking for but don’t own yet">
                    <AddCardModal defaultTarget="wishlist" trigger={<Button iconLeading={Plus}>Add to wishlist</Button>} />
                </AppEmptyState>
            }
        />
    );
}
