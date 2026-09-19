import { StatCard } from "@/components/app/cards-stats";
import type { PokedexSetting } from "@/lib/binder-rule";
import { getBinder, getDexBinder } from "@/lib/binders";
import { getAllMyCards } from "@/lib/cards";
import { groupByDex } from "@/lib/dex-groups";
import { formatCount } from "@/lib/format";
import { type HomeList, UUID, listFilter } from "@/lib/home-list";
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

/**
 * A chosen list's sets and Pokémon, for Home's counts, from one read of every card in it: the API's
 * facets are the whole collection's whatever the filter, so a list's sets are counted here. Its
 * Pokémon are counted as its own Pokédex counts them where the binder is shown as one (its rarities
 * and range), and every species on its cards otherwise. Null for no tiles. Kept per person and list
 * in the `lists` scope, which a card write, a star and a binder edit all forget, so the two numbers
 * never stand beside a fresher value.
 */
export type ListNumbers = { sets: number; caught: number };

export async function readListNumbers(list: HomeList): Promise<ListNumbers | null> {
    return sideRead(
        "list numbers",
        async () => {
            const binder = UUID.test(list) ? await getBinder(list) : null;
            const setting: PokedexSetting = binder?.pokedex ?? { missing: false };
            return perUser("lists", `list-numbers:v1:${list}:${JSON.stringify(setting)}`, async (token) => {
                const [all, names] = await Promise.all([getAllMyCards({ ...listFilter(list), facets: false, pictures: false }, token), getDexNames()]);
                const sets = new Set(all.cards.map((c) => c.set_name ?? c.set).filter(Boolean)).size;
                return { sets, caught: groupByDex(all.cards, names, setting).caught };
            });
        },
        null,
    );
}

/** The Pokémon tile for a chosen list: its species, leading to the list in Pokédex order. */
export async function ListDexStat({ numbers: read, href }: { numbers: Promise<ListNumbers | null>; href: string }) {
    const caught = (await read)?.caught ?? null;
    if (caught === null) return null;
    return <StatCard label="Pokémon" value={formatCount(caught)} href={`${href}?sort=dex`} delay={120} />;
}
