import { ApiError, api } from "@/lib/api";
import { type Binder, binderFromApi, bindersAnswer } from "@/lib/api-shapes";
import type { BinderKind, BinderRule, PokedexSetting } from "@/lib/binder-rule";
import { getStats } from "@/lib/cards";
import { perUser } from "@/lib/user-cache";

export type BinderSummary = { id: string; name: string; count: number; kind: BinderKind; rule: BinderRule | null };

// The API calls them folders (`/folders`) and its cards carry `collection_id`; here and on every
// screen they are binders ("collection" is the whole of what you own). Kept five minutes per person: the layout asks on every
// screen, and every write to a binder or a card drops the cache.
const binders = (): Promise<Binder[]> =>
    perUser("binders", "folders", async (token) => (await api("/folders", { token, schema: bindersAnswer })).folders.map(binderFromApi));

export async function getBinderOverview(): Promise<{
    binders: BinderSummary[];
    ownedCount: number;
    favoritesCount: number;
}> {
    const [list, stats] = await Promise.all([binders(), getStats()]);
    return {
        binders: list.map((f) => ({ id: f.id, name: f.name, count: f.count, kind: f.kind, rule: f.rule })),
        ownedCount: stats.cards,
        favoritesCount: stats.favorites,
    };
}

/**
 * The binder shown as a Pokédex, which is where the Pokédex lives now: it stopped being a fixture
 * on the profile (`profiles.pokedex`) and became a binder like any other, one you can edit and
 * delete. Home's tile and the old `/dashboard/pokedex` address both ask for it here.
 *
 * The first one, where somebody keeps two: a person with two dexes has said the second is worth
 * keeping, not that the first stopped counting. Null where there is none, which is a person who
 * deleted theirs, and nothing about the Pokédex is then drawn.
 */
export async function getDexBinder(): Promise<{ id: string; name: string; pokedex: PokedexSetting } | null> {
    const found = (await binders()).find((f) => f.pokedex);
    return found?.pokedex ? { id: found.id, name: found.name, pokedex: found.pokedex } : null;
}

/**
 * The binder names and their counts, as the API answers them: a failed read throws. For the
 * sidebar's read after a write, where an empty list would wipe the binders the layout drew.
 */
export async function readMyBinders(): Promise<{ id: string; name: string; kind: BinderKind; count: number }[]> {
    return (await binders()).map((f) => ({ id: f.id, name: f.name, kind: f.kind, count: f.count }));
}

/**
 * The binder names and their counts, for the sidebar. Fails soft: a sidebar without its binders is a poorer page,
 * a thrown error is no page at all, and on 2026-09-04 a catalogue outage took every screen down
 * through this one read. A 401 still throws: that is the session, not the binders.
 */
export async function getMyBinders(): Promise<{ id: string; name: string; kind: BinderKind; count: number }[]> {
    try {
        return await readMyBinders();
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err;
        console.error("Binders unavailable, sidebar drawn without them:", err instanceof Error ? err.message : err);
        return [];
    }
}

/**
 * Every binder with its rule, for the card sheet and the Got it form: the same cached read the
 * sidebar makes, so opening a sheet is a cache hit rather than its own GET /folders (182 ms on
 * 2026-09-16). Fails soft to none, as the sheet always did: without them a sheet files nowhere.
 */
export async function getBinderChoices(): Promise<{ id: string; name: string; rule: BinderRule | null }[]> {
    try {
        return (await binders()).map((f) => ({ id: f.id, name: f.name, rule: f.rule }));
    } catch {
        return [];
    }
}

/**
 * How many cards you have starred, for the sidebar's Favorites row. Fails soft as the binders
 * do: null draws the row without a number. The stats are cached like the binders, in their own
 * scope, so the frame pays this read once per five minutes and after a card write.
 */
export async function getFavoritesCount(): Promise<number | null> {
    try {
        return (await getStats()).favorites;
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err;
        console.error("Stats unavailable, sidebar drawn without the favorites count:", err instanceof Error ? err.message : err);
        return null;
    }
}

export type BinderDetail = { id: string; name: string; kind: BinderKind; rule: BinderRule | null; pokedex: PokedexSetting | null; isPublic: boolean };

export async function getBinder(id: string): Promise<BinderDetail | null> {
    const found = (await binders()).find((f) => f.id === id);
    return found ? { id: found.id, name: found.name, kind: found.kind, rule: found.rule, pokedex: found.pokedex, isPublic: found.isPublic } : null;
}
