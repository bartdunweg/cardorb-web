import { Suspense } from "react";
import { AddCardButton } from "@/components/app/add-card-button";
import { AppEmptyState } from "@/components/app/app-empty-state";
import { CardsStats, ListStats, StatCard } from "@/components/app/cards-stats";
import { DexStat, ListDexStat, readDexCaught, readListNumbers } from "@/components/app/dex-stat";
import { HomeListChoice } from "@/components/app/home-list-choice";
import { HomePeriodProvider } from "@/components/app/home-period";
import { Movers } from "@/components/app/movers";
import { ValueHeroOutline } from "@/components/app/skeletons";
import { TopCards, readTopCards } from "@/components/app/top-cards";
import { ValueHero, type ValueList } from "@/components/app/value-hero";
import { Button } from "@/components/base/buttons/button";
import { getMyBinders } from "@/lib/binders";
import { type CardList, getCardStats, getMyCards } from "@/lib/cards";
import { UUID, askedList, listFilter, listPath } from "@/lib/home-list";
import { getMyProfile } from "@/lib/profile";
import { sideRead } from "@/lib/side-read";
import { type ValueSnapshot, getValueHistory } from "@/lib/value-history";

type ValueReads = { binders: Awaited<ReturnType<typeof getMyBinders>>; snapshots: ValueSnapshot[]; current: CardList | null };

/**
 * Every read Home makes beside the stats, started at once. None of them takes a number from the stats,
 * so none waits for it: the value's line, the top cards and the Pokémon count used to begin only once
 * the stats were in, one round trip after the page could have asked.
 *
 * Each is a side read and never rejects, so a promise nobody ends up reading (an account with nothing
 * held draws the welcome instead) cannot fail the page.
 */
function startReads(asked: string) {
    const binders = sideRead("binders", getMyBinders, null);
    const selected = binders.then((f) => chosenList(asked, f));
    /* Each of these is a side read: one that fails leaves the chart without its line, the menu
       without the binders, or the collection's own number in place of a list's, never Home as an
       error page. */
    const value: Promise<ValueReads> = selected.then((list) =>
        Promise.all([
            binders.then((f) => f ?? []),
            sideRead("value history", () => getValueHistory(list === "all" ? undefined : list), []),
            list === "all"
                ? null
                : sideRead(
                      "list value",
                      () =>
                          // No facets: the API's are the whole collection's; a list's sets are counted in readListNumbers.
                          getMyCards({ ...listFilter(list), limit: 1, facets: false }),
                      null,
                  ),
        ]).then(([f, snapshots, current]) => ({ binders: f, snapshots, current })),
    );
    // The dearest cards and the counts are the chosen list's too; the collection's Pokémon count is the Pokédex's own.
    return {
        selected,
        value,
        top: selected.then((list) => readTopCards(list)),
        caught: selected.then((list) => (list === "all" ? readDexCaught() : null)),
        numbers: selected.then((list) => (list === "all" ? null : readListNumbers(list))),
    };
}

// Everything on Home that needs a number: the value with its line, the counts, and the top cards.
// The stats are the page's own read: one that fails is Home's error screen (error.tsx).
export async function HomeBody({ searchParams }: { searchParams: Promise<{ value?: string }> }) {
    const { value } = await searchParams;
    const reads = startReads(askedList(value));
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
                    {selected === "all" ? (
                        <CardsStats
                            stats={stats}
                            fourth={
                                <Suspense fallback={<StatCard label="Pokémon collected" value=" " href="/dashboard/cards?sort=dex" delay={120} />}>
                                    <DexStat caught={reads.caught} />
                                </Suspense>
                            }
                        />
                    ) : (
                        // A list's own four counts, from the same read as its value.
                        <Suspense fallback={<ListStatsOutline />}>
                            <ListCounts selected={selected} stats={stats} reads={reads} />
                        </Suspense>
                    )}
                    {/* The dearest cards first, then what moved the value (Bart, 2026-09-15). */}
                    <Suspense fallback={null}>
                        <TopCards top={reads.top} href={listPath(selected)} />
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
// collection's own number, already read for the tiles; a binder's, the favorites' or the
// wishlist's is one narrow list read, started with the rest of Home's reads.
async function ValueSection({ selected, total, reads }: { selected: string; total: number; reads: Promise<ValueReads> }) {
    const { binders, snapshots, current } = await reads;
    const lists = homeLists(binders);
    // A list whose own value could not be read is shown as the collection, whose number is in hand.
    const known = lists.some((l) => l.id === selected) && (selected === "all" || current !== null);
    return (
        <ValueHero
            name={(known ? lists.find((l) => l.id === selected)?.name : undefined) ?? "Collection"}
            selected={known ? selected : "all"}
            value={current && known ? (current.value ?? 0) : total}
            snapshots={known ? snapshots : []}
        />
    );
}

/** As the sidebar has them: the collection and the wishlist, then Favorites and the binders. */
function homeLists(binders: { id: string; name: string }[]): ValueList[] {
    return [
        { id: "all", name: "Collection" },
        { id: "wishlist", name: "Wishlist" },
        { id: "favorites", name: "Favorites" },
        ...binders.map((f) => ({ id: f.id, name: f.name })),
    ];
}

// The four counts of a chosen list: its cards, the printings among them, the sets they come from and
// the Pokémon on them. A list whose read failed shows the collection's counts, as its value does.
async function ListCounts({
    selected,
    stats,
    reads,
}: {
    selected: string;
    stats: Awaited<ReturnType<typeof getCardStats>>;
    reads: ReturnType<typeof startReads>;
}) {
    const [{ current }, numbers] = await Promise.all([reads.value, reads.numbers]);
    if (!current) return <CardsStats stats={stats} fourth={null} />;
    const href = listPath(selected);
    return (
        <ListStats
            copies={current.copies ?? current.total}
            // A wish is one card: the wishlist's two counts would say the same number twice.
            unique={selected === "wishlist" ? undefined : current.total}
            sets={numbers?.sets ?? null}
            href={href}
            pokemon={<ListDexStat numbers={Promise.resolve(numbers)} href={href} />}
        />
    );
}

function ListStatsOutline() {
    return (
        <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {["Cards", "Unique", "Sets", "Pokémon"].map((label, i) => (
                <StatCard key={label} label={label} value=" " delay={i * 40} />
            ))}
        </div>
    );
}

/**
 * The list choice in Home's header, beside the avatar: every list Home can be about, and the one the
 * address asks for. Nothing for an account that holds nothing yet: Home is then its welcome, which
 * has no list to be about.
 */
export async function HomeListMenu({ searchParams }: { searchParams: Promise<{ value?: string }> }) {
    const { value } = await searchParams;
    const [stats, binders] = await Promise.all([getCardStats(), sideRead("binders", getMyBinders, null)]);
    if (stats.owned === 0) return null;
    return <HomeListChoice lists={homeLists(binders ?? [])} selected={chosenList(askedList(value), binders)} />;
}

/**
 * The list Home is about, decided once for the header and the body alike: a binder only while the
 * binders are read and still hold it (deleted since the address was kept, or unreadable, it is the
 * collection), so the button, the value and the counts never name two different lists.
 */
function chosenList(asked: string, binders: { id: string }[] | null): string {
    if (!UUID.test(asked)) return asked;
    return binders?.some((b) => b.id === asked) ? asked : "all";
}
