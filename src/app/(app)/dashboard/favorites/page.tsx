import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { ListSettingsDialog } from "@/components/app/list-settings-dialog";
import { type CardFilter, getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";
import { getMyProfile } from "@/lib/profile";

// Starred cards you own. A favourite is a flag on a card in the collection (CLAUDE.md), so this asks the
// API for owned copies only; a wish cannot carry a star here. The list itself is not awaited: see cards/page.tsx.
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity, gen, type, unpriced } = query;
    const filter: CardFilter = { favoritesOnly: true, q, sort, order, set, rarity, gen, type, ...(unpriced ? { priced: false } : {}) };
    const narrowed = isNarrowed(query);
    const list = getMyCards(filter);
    const datapoints = list.then((r) => ({ total: r.total, narrowed, value: r.value, unpriced: r.unpriced }));
    const { profile } = await getMyProfile();
    const facets = list.then((r) => r.facets);

    return (
        <FolderPage
            title="Favorites"
            back={{ href: "/dashboard/collections", label: "Collections" }}
            datapoints={datapoints}
            settings={(compact) => <ListSettingsDialog list="favorites" title="Favorites" isPublic={profile?.favorites_public ?? false} compact={compact} />}
            query={query}
            basePath="/dashboard/favorites"
            facets={facets}
            list={list}
            filter={filter}
            empty={<AppEmptyState icon="star" title="No favorites yet" description="Star a card to keep it here for quick access" />}
        />
    );
}
