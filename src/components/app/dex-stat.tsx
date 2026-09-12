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
// told a number about a view they got rid of, and there is nowhere for the tile to lead.
export async function DexStat() {
    const binder = await getDexBinder();
    if (!binder) return null;
    const [all, names] = await Promise.all([getAllMyCards({ facets: false }), getDexNames()]);
    const { caught, range } = groupByDex(all.cards, names, binder.pokedex);
    const total = range.to - range.from + 1;
    return (
        <StatCard
            label="Pokémon collected"
            value={formatCount(caught)}
            detail={`of ${formatCount(total)}`}
            href={`/dashboard/collections/${binder.id}`}
            delay={120}
        />
    );
}
