import { Suspense } from "react";
import { AddCardButton } from "@/components/app/add-card-button";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsStats, StatCard } from "@/components/app/cards-stats";
import { DexStat, readDexCaught } from "@/components/app/dex-stat";
import { HomePeriodProvider } from "@/components/app/home-period";
import { Movers } from "@/components/app/movers";
import { ValueHeroOutline } from "@/components/app/skeletons";
import { TopCards, readTopCards } from "@/components/app/top-cards";
import { ValueHero, type ValueList } from "@/components/app/value-hero";
import { Button } from "@/components/base/buttons/button";
import { type CardList, getCardStats, getMyCards } from "@/lib/cards";
import { getMyFolders } from "@/lib/collections";
import { getMyProfile } from "@/lib/profile";
import { sideRead } from "@/lib/side-read";
import { type ValueSnapshot, getValueHistory } from "@/lib/value-history";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ValueReads = { folders: Awaited<ReturnType<typeof getMyFolders>>; snapshots: ValueSnapshot[]; current: CardList | null };

/**
 * Every read Home makes beside the stats, started at once. None of them takes a number from the stats,
 * so none waits for it: the value's line, the top cards and the Pokémon count used to begin only once
 * the stats were in, one round trip after the page could have asked.
 *
 * Each is a side read and never rejects, so a promise nobody ends up reading (an account with nothing
 * held draws the welcome instead) cannot fail the page.
 */
function startReads(asked: string) {
    const folders = sideRead("folders", getMyFolders, null);
    // A binder deleted since the address was kept is the collection, movers and line included.
    const selected = UUID.test(asked) ? folders.then((f) => (f && !f.some((folder) => folder.id === asked) ? "all" : asked)) : Promise.resolve(asked);
    /* Each of these is a side read: one that fails leaves the chart without its line, the menu
       without the binders, or the collection's own number in place of a list's, never Home as an
       error page. */
    const value: Promise<ValueReads> = selected.then((list) =>
        Promise.all([
            folders.then((f) => f ?? []),
            sideRead("value history", () => getValueHistory(list === "all" ? undefined : list), []),
            list === "all"
                ? null
                : sideRead(
                      "list value",
                      () =>
                          getMyCards(
                              list === "favorites"
                                  ? { favoritesOnly: true, limit: 1, facets: false }
                                  : list === "wishlist"
                                    ? { wishlist: true, limit: 1, facets: false }
                                    : { collectionId: list, limit: 1, facets: false },
                          ),
                      null,
                  ),
        ]).then(([f, snapshots, current]) => ({ folders: f, snapshots, current })),
    );
    return { selected, value, top: readTopCards(), caught: readDexCaught() };
}

// Everything on Home that needs a number: the value with its line, the counts, and the top cards.
// The stats are the page's own read: one that fails is Home's error screen (error.tsx).
export async function HomeBody({ searchParams }: { searchParams: Promise<{ value?: string }> }) {
    const { value } = await searchParams;
    const asked = value === "favorites" || value === "wishlist" || (value && UUID.test(value)) ? value : "all";
    const reads = startReads(asked);
    const [stats, selected] = await Promise.all([getCardStats(), reads.selected]);
    // Nothing held: the first visits after signing up. A value of €0 with an empty chart and four
    // zeros said the account was empty and not what to do about it, and one wished-for card is
    // still that: the value, the chart and the tiles all count owned cards only.
    const fresh = stats.owned === 0;

    return (
        <>
            {fresh ? (
                <Welcome />
            ) : (
                <HomePeriodProvider>
                    <Suspense fallback={<ValueHeroOutline />}>
                        <ValueSection selected={selected} total={stats.value} reads={reads.value} />
                    </Suspense>
                    <CardsStats
                        stats={stats}
                        fourth={
                            <Suspense fallback={<StatCard label="Pokémon collected" value=" " href="/dashboard/cards?sort=dex" delay={120} />}>
                                <DexStat caught={reads.caught} />
                            </Suspense>
                        }
                    />
                    {/* The dearest cards first, then what moved the value (Bart, 2026-09-15). */}
                    <Suspense fallback={null}>
                        <TopCards top={reads.top} />
                    </Suspense>
                    {/* Over the chart's period. The collection's alone: the movers are read over every card held,
                        so under a binder's line they would answer another question. */}
                    {/* Keyed on what you hold: a write redraws Home, and the answers kept per period were read before it. */}
                    {selected === "all" ? <Movers key={`${stats.owned}:${stats.value}`} /> : null}
                </HomePeriodProvider>
            )}
        </>
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
// wishlist's is one narrow list read, started with the rest of Home's reads.
async function ValueSection({ selected, total, reads }: { selected: string; total: number; reads: Promise<ValueReads> }) {
    const { folders, snapshots, current } = await reads;
    // The wishlist last: its number is what the cards you lack would cost, not what you hold.
    const lists: ValueList[] = [
        { id: "all", name: "Collection" },
        { id: "favorites", name: "Favorites" },
        ...folders.map((f) => ({ id: f.id, name: f.name })),
        { id: "wishlist", name: "Wishlist" },
    ];
    // A list whose own value could not be read is shown as the collection, whose number is in hand.
    const known = lists.some((l) => l.id === selected) && (selected === "all" || current !== null);
    return (
        <ValueHero
            lists={lists}
            selected={known ? selected : "all"}
            value={current && known ? (current.value ?? 0) : total}
            snapshots={known ? snapshots : []}
        />
    );
}
