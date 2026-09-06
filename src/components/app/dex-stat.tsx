import { StatCard } from "@/components/app/cards-stats";
import { getAllMyCards } from "@/lib/cards";
import { groupByDex } from "@/lib/dex-groups";
import { DEFAULT_POKEDEX } from "@/lib/folder-rule";
import { getDexNames } from "@/lib/pokedex";
import { getMyProfile } from "@/lib/profile";

// The fourth tile: how many Pokémon the collection covers, counted the way the Pokédex page
// counts them (the person's own rarities and range), so the two say the same number. Reads every
// card, so it is rendered under Suspense: the other three tiles do not wait for it.
export async function DexStat() {
    const [all, names, me] = await Promise.all([getAllMyCards({ facets: false }), getDexNames(), getMyProfile()]);
    const setting = me.profile?.pokedex ?? DEFAULT_POKEDEX;
    const { caught, range } = groupByDex(all.cards, names, setting);
    const total = range.to - range.from + 1;
    return <StatCard label="Pokémon collected" value={caught.toLocaleString("en-US")} detail={`of ${total.toLocaleString("en-US")}`} delay={120} />;
}
