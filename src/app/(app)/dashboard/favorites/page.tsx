import type { Metadata } from "next";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { BinderPage } from "@/components/app/binder-page";
import { LinkButton } from "@/components/app/link-button";
import { ListSettingsDialog } from "@/components/app/list-settings-dialog";
import { PageHeader } from "@/components/app/page-header";
import { SignInInvite } from "@/components/app/sign-in-invite";
import { session } from "@/lib/api";
import { type CardFilter, getMyCards } from "@/lib/cards";
import { openAsLeft } from "@/lib/list-memory-server";
import { type ListSearchParams, changeWindow, isNarrowed, readListQuery } from "@/lib/list-query";
import { getMyProfile } from "@/lib/profile";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
// Out of the index: an empty Favorites in a search result is worse than none.
export const metadata: Metadata = { title: "Favorites", robots: { index: false } };

// Starred cards you own. A favourite is a flag on a card in the collection (CLAUDE.md), so this asks the
// API for owned copies only; a wish cannot carry a star here. The list itself is not awaited: see cards/page.tsx.
export default async function FavoritesPage({ searchParams }: { searchParams: Promise<ListSearchParams> }) {
    const mine = await session();
    // Before any read of the person's: a visitor gets an invitation where an error or a blank would
    // have been, and the page keeps its title so they still know which page answered.
    if (!mine)
        return (
            <div className="flex flex-1 flex-col gap-6">
                <PageHeader title="Favorites" back={{ href: "/dashboard/collections", label: "Binders" }} />
                <SignInInvite place="binders" />
            </div>
        );

    const params = await searchParams;
    // A bare address opens the list as it was left (list-memory-server.ts).
    await openAsLeft("/dashboard/favorites", params);
    const query = readListQuery(params);
    const { q, sort, order, set, rarity, fullArt, gen, type, condition, finish, language, duplicates } = query;
    const filter: CardFilter = {
        favoritesOnly: true,
        q,
        sort,
        order,
        // A change sort reads over its period's days (list-query.ts changeWindow).
        ...(sort === "change" ? changeWindow(query) : {}),
        set,
        rarity,
        fullArt,
        gen,
        type,
        condition,
        finish,
        language,
        duplicates,
    };
    const narrowed = isNarrowed(query);
    const list = getMyCards(filter);
    const datapoints = list.then((r) => ({ total: r.total, copies: r.copies ?? undefined, narrowed, value: r.value, unpriced: r.unpriced, listed: r.listed }));
    const { profile } = await getMyProfile();
    const facets = list.then((r) => r.facets);

    return (
        <BinderPage
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
                <AppEmptyState icon="star" title="No favorites yet" description="Star a card you own to keep it here.">
                    <LinkButton href="/dashboard/cards" color="secondary">
                        Go to Collection
                    </LinkButton>
                </AppEmptyState>
            }
        />
    );
}
