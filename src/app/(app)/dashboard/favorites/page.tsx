import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { FolderPage } from "@/components/app/folder-page";
import { LinkButton } from "@/components/app/link-button";
import { ListSettingsDialog } from "@/components/app/list-settings-dialog";
import { type CardFilter, getMyCards } from "@/lib/cards";
import { type ListSearchParams, isNarrowed, readListQuery } from "@/lib/list-query";
import { getMyProfile } from "@/lib/profile";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Favorites" };

// Starred cards you own. A favourite is a flag on a card in the collection (CLAUDE.md), so this asks the
// API for owned copies only; a wish cannot carry a star here. The list itself is not awaited: see cards/page.tsx.
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const query = readListQuery(await searchParams);
    const { q, sort, order, set, rarity, fullArt, gen, type, condition, finish, language, unpriced, duplicates } = query;
    const filter: CardFilter = {
        favoritesOnly: true,
        q,
        sort,
        order,
        set,
        rarity,
        fullArt,
        gen,
        type,
        condition,
        finish,
        language,
        duplicates,
        ...(unpriced ? { priced: false } : {}),
    };
    const narrowed = isNarrowed(query);
    const list = getMyCards(filter);
    const datapoints = list.then((r) => ({ total: r.total, copies: r.copies ?? undefined, narrowed, value: r.value, unpriced: r.unpriced }));
    const { profile } = await getMyProfile();
    const facets = list.then((r) => r.facets);

    return (
        <FolderPage
            title="Favorites"
            back={{ href: "/dashboard/collections", label: "Binders" }}
            datapoints={datapoints}
            settings={(compact) => <ListSettingsDialog list="favorites" title="Favorites" isPublic={profile?.favorites_public ?? false} compact={compact} />}
            query={query}
            basePath="/dashboard/favorites"
            facets={facets}
            list={list}
            filter={filter}
            empty={
                // The star is on a card you own, so the way here runs through the collection.
                <AppEmptyState icon="star" title="No favorites yet" description="Star a card you own to keep it here">
                    <LinkButton href="/dashboard/cards" color="secondary">
                        Go to Collection
                    </LinkButton>
                </AppEmptyState>
            }
        />
    );
}
