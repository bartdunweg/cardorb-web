import type { Metadata } from "next";
import { AddCardButton } from "@/components/app/add-card-button";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { ListSettingsDialog } from "@/components/app/list-settings-dialog";
import { type CardFilter, getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";
import { getMyProfile } from "@/lib/profile";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Wishlist" };

// Cards you want but do not own. Outside the collection, so the API is asked for the wishes only.
// The list itself is not awaited: see cards/page.tsx.
export default async function WishlistPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity, fullArt, gen, type, unpriced } = query;
    const filter: CardFilter = { wishlist: true, q, sort, order, set, rarity, fullArt, gen, type, ...(unpriced ? { priced: false } : {}) };
    const narrowed = isNarrowed(query);
    const list = getMyCards(filter);
    const datapoints = list.then((r) => ({ total: r.total, copies: r.copies ?? undefined, narrowed, value: r.value, unpriced: r.unpriced }));
    const { profile } = await getMyProfile();
    const facets = list.then((r) => r.facets);

    return (
        <FolderPage
            title="Wishlist"
            datapoints={datapoints}
            settings={(compact) => <ListSettingsDialog list="wishlist" title="Wishlist" isPublic={profile?.wishlist_public ?? false} compact={compact} />}
            add={(compact) => <AddCardButton compact={compact} />}
            query={query}
            basePath="/dashboard/wishlist"
            facets={facets}
            list={list}
            filter={filter}
            empty={
                <AppEmptyState
                    icon="heart"
                    title="Your wishlist is empty"
                    description="Find a card you’re looking for and add it to your wishlist from its preview"
                >
                    {/* The palette opens with nothing preset (Bart's call, see add-card-button.tsx), so the
                        button says what it does; "Add to wishlist" promised a step the palette leaves to you. */}
                    <AddCardButton label="Find a card" />
                </AppEmptyState>
            }
        />
    );
}
