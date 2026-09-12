import { Suspense } from "react";
import type { Metadata } from "next";
import { AddCardButton } from "@/components/app/add-card-button";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsStats, StatCard } from "@/components/app/cards-stats";
import { PhoneSearchTrigger } from "@/components/app/command-search";
import { DexStat } from "@/components/app/dex-stat";
import { PageHeader } from "@/components/app/page-header";
import { ValueHeroOutline } from "@/components/app/skeletons";
import { TopCards } from "@/components/app/top-cards";
import { ValueHero, type ValueList } from "@/components/app/value-hero";
import { YouLink } from "@/components/app/you-link";
import { Button } from "@/components/base/buttons/button";
import { getCardStats, getMyCards } from "@/lib/cards";
import { getMyFolders } from "@/lib/collections";
import { getMyProfile } from "@/lib/profile";
import { getValueHistory } from "@/lib/value-history";

// The tab's name, which the root layout's template finishes as “… · Cardorb”: without it every
// tab and every history entry read “Cardorb”. The word is the one the navigation uses for this page.
export const metadata: Metadata = { title: "Home" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Home: the value first, big, with its line and the period it moved over; then the counts. The
// title and the three counts come with the page; the value section and the Pokémon tile stream
// in behind them, each with an outline in its place.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ value?: string }> }) {
    const { value } = await searchParams;
    const selected = value === "favorites" || value === "wishlist" || (value && UUID.test(value)) ? value : "all";
    const stats = await getCardStats();
    // Nothing held and nothing wanted: the first visit after signing up. A value of €0 with an
    // empty chart and four zeros said the account was empty and not what to do about it.
    const fresh = stats.owned === 0 && stats.wishlist === 0;

    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title="Home"
                titleOnPhone={false}
                // On a phone the search runs the width of the page, the avatar at its right end: the row Home starts with.
                above={
                    <div className="flex items-center gap-3 lg:hidden">
                        <PhoneSearchTrigger className="min-w-0 flex-1" />
                        <YouLink />
                    </div>
                }
            />
            {fresh ? (
                <Welcome />
            ) : (
                <>
                    <Suspense fallback={<ValueHeroOutline />}>
                        <ValueSection selected={selected} total={stats.value} />
                    </Suspense>
                    <CardsStats
                        stats={stats}
                        fourth={
                            <Suspense fallback={<StatCard label="Pokémon collected" value=" " href="/dashboard/pokedex" delay={120} />}>
                                <DexStat />
                            </Suspense>
                        }
                    />
                    <Suspense fallback={null}>
                        <TopCards />
                    </Suspense>
                </>
            )}
        </div>
    );
}

// The first thing a new account sees: the one action that fills every page, and the name the
// account was given. Sign-up asked for no name, so the profile carries one drawn from the email
// with four random characters after it, and it is the address of the public page, so it is worth
// a line here where the person is, not only in Settings where they may never look.
async function Welcome() {
    const { profile } = await getMyProfile();
    const name = profile?.display_name || profile?.username;
    return (
        <AppEmptyState
            icon="plus"
            title="Welcome to Cardorb"
            description={
                name
                    ? `Add your first card to start your collection. You are signed in as ${name}, which is also the address of your public page; choose a name of your own.`
                    : "Add your first card to start your collection."
            }
        >
            <AddCardButton label="Add your first card" />
            {/* Straight into the sheet with the name field, not the page it sits behind. */}
            <Button href="/dashboard/settings?profile=1" color="secondary" size="md">
                Choose your name
            </Button>
        </AppEmptyState>
    );
}

// The value of the chosen list, its line, and the lists to choose from. "All cards" is the
// collection's own number, already read for the tiles; a folder's, the favorites' or the
// wishlist's is one narrow list read.
async function ValueSection({ selected, total }: { selected: string; total: number }) {
    const [folders, snapshots, current] = await Promise.all([
        getMyFolders(),
        getValueHistory(selected === "all" ? undefined : selected),
        selected === "all"
            ? null
            : getMyCards(
                  selected === "favorites"
                      ? { favoritesOnly: true, limit: 1, facets: false }
                      : selected === "wishlist"
                        ? { wishlist: true, limit: 1, facets: false }
                        : { collectionId: selected, limit: 1, facets: false },
              ),
    ]);
    // The wishlist last: its number is what the cards you lack would cost, not what you hold.
    const lists: ValueList[] = [
        { id: "all", name: "Collection" },
        { id: "favorites", name: "Favorites" },
        ...folders.map((f) => ({ id: f.id, name: f.name })),
        { id: "wishlist", name: "Wishlist" },
    ];
    const known = lists.some((l) => l.id === selected);
    return (
        <ValueHero
            lists={lists}
            selected={known ? selected : "all"}
            value={current && known ? (current.value ?? 0) : total}
            snapshots={known ? snapshots : []}
        />
    );
}
