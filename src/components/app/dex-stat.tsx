import { StatCard } from "@/components/app/cards-stats";
import type { PokedexSetting } from "@/lib/binder-rule";
import { getDexBinder } from "@/lib/binders";
import { getAllMyCards } from "@/lib/cards";
import { groupByDex } from "@/lib/dex-groups";
import { formatCount } from "@/lib/format";
import { getDexNames } from "@/lib/pokedex";
import { sideRead } from "@/lib/side-read";
import { perUser } from "@/lib/user-cache";

// The fourth tile: how many Pokémon the collection covers, counted the way the Pokédex counts
// them (that binder's own rarities and range), so the two say the same number. Reads every card,
// so it is rendered under Suspense: the other three tiles do not wait for it.
//
// Nothing where there is no binder shown as a Pokédex. A person who deleted theirs should not be
// told a number about a view they got rid of.
//
// It leads to the collection in Pokédex order, not to the Pokédex binder: the tile counts the cards
// you hold, and the list of them by number is where you read that (Bart's call, 2026-09-14).
//
// `caught` is the read, started by the page before it waits on the stats (readDexCaught): the tile
// only draws what it answers.
export async function DexStat({ caught: read }: { caught: Promise<number | null> }) {
    // The count alone: "of 1,025" beside it went (Bart, 2026-09-15).
    const caught = await read;
    if (caught === null) return null;
    return <StatCard label="Pokémon collected" value={formatCount(caught)} href="/dashboard/cards?sort=dex" delay={120} />;
}

/**
 * The Pokémon count, or null for no tile. Never rejects: either read failing leaves the tile out, as
 * having no Pokédex binder does, and Home stands. So it can be started ahead of the reads Home waits on.
 */
export async function readDexCaught(): Promise<number | null> {
    const binder = await sideRead("dex binder", getDexBinder, null);
    if (!binder) return null;
    return sideRead("dex caught", () => caughtCount(binder.pokedex), null);
}

// The number alone is kept per person, in the stats scope and window as the rest of Home: reading
// every card to count them took a two-thousand-card read on each open of Home, which no cache
// held (the list cache keeps first batches only). Only the count is stored, not the cards. A
// card write drops it (forgetMine). The setting is in the key, so a binder given other
// rarities or another range counts afresh rather than waiting on the tag.
function caughtCount(setting: PokedexSetting): Promise<number> {
    return perUser("stats", `dex-caught:v1:${JSON.stringify(setting)}`, async (token) => {
        // No pictures: the tile counts species and draws nothing, and the printings' pictures of a
        // whole collection were 1,191 ms of the 1,442 ms this read cost (measured 2026-09-18).
        const [all, names] = await Promise.all([getAllMyCards({ facets: false, pictures: false }, token), getDexNames()]);
        return groupByDex(all.cards, names, setting).caught;
    });
}
