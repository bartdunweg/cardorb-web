import { StatCard } from "@/components/app/cards-stats";
import { getAllMyCards } from "@/lib/cards";
import { getDexBinder } from "@/lib/collections";
import { groupByDex } from "@/lib/dex-groups";
import { formatCount } from "@/lib/format";
import { getDexNames } from "@/lib/pokedex";

// The fourth tile: how many Pokémon the collection covers, counted the way the Pokédex counts
// them (that binder's own rarities and range), so the two say the same number. Reads every card,
// so it is rendered under Suspense: the other three tiles do not wait for it.
//
// Nothing where there is no binder shown as a Pokédex. A person who deleted theirs should not be
// told a number about a view they got rid of.
//
// It leads to the collection in Pokédex order, not to the Pokédex binder: the tile counts the cards
// you hold, and the list of them by number is where you read that (Bart's call, 2026-09-14).
export async function DexStat() {
    const binder = await getDexBinder();
    if (!binder) return null;
    const [all, names] = await Promise.all([getAllMyCards({ facets: false }), getDexNames()]);
    // The count alone: "of 1,025" beside it went (Bart, 2026-09-15).
    const { caught } = groupByDex(all.cards, names, binder.pokedex);
    return <StatCard label="Pokémon collected" value={formatCount(caught)} href="/dashboard/cards?sort=dex" delay={120} />;
}
