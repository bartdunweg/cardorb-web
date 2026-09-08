import { Suspense } from "react";
import type { Metadata } from "next";
import { CardsStats, StatCard } from "@/components/app/cards-stats";
import { DexStat } from "@/components/app/dex-stat";
import { MobileTopRow } from "@/components/app/mobile-top-row";
import { PageHeader } from "@/components/app/page-header";
import { ValueHeroOutline } from "@/components/app/skeletons";
import { TopCards } from "@/components/app/top-cards";
import { ValueHero, type ValueList } from "@/components/app/value-hero";
import { YouLink } from "@/components/app/you-link";
import { getCardStats, getMyCards } from "@/lib/cards";
import { getMyFolders } from "@/lib/collections";
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

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Home"
                titleOnPhone={false}
                // On a phone the search runs the width of the page, the avatar at its right end: the row Home starts with.
                above={
                    <div className="flex items-center gap-3 lg:hidden">
                        <MobileTopRow className="min-w-0 flex-1" />
                        <YouLink />
                    </div>
                }
            />
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
        </div>
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
