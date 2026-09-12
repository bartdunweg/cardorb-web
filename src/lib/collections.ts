import { ApiError, api } from "@/lib/api";
import { type Folder, type FolderItem, folderFromApi, foldersAnswer } from "@/lib/api-shapes";
import { getAllMyCards, getStats } from "@/lib/cards";
import { groupByDex } from "@/lib/dex-groups";
import { DEFAULT_POKEDEX, type FolderKind, type FolderRule, type PokedexSetting } from "@/lib/folder-rule";
import { getMyProfile } from "@/lib/profile";
import { perUser } from "@/lib/user-cache";

export type CollectionSummary = { id: string; name: string; count: number; kind: FolderKind; rule: FolderRule | null };

// The API calls them folders — "collection" is the whole of what you own there — and the
// screens keep calling them collections. Kept five minutes per person: the layout asks on every
// screen, and every write to a folder or a card drops the cache.
const folders = (): Promise<Folder[]> =>
    perUser("folders", async (token) => (await api("/folders", { token, schema: foldersAnswer })).folders.map(folderFromApi));

export async function getMyCollections(): Promise<{
    collections: CollectionSummary[];
    ownedCount: number;
    favoritesCount: number;
    pokedexCount: number | null;
}> {
    const [list, stats, pokedexCount] = await Promise.all([folders(), getStats(), getPokedexCount()]);
    return {
        collections: list.map((f) => ({ id: f.id, name: f.name, count: f.count, kind: f.kind, rule: f.rule })),
        ownedCount: stats.cards,
        favoritesCount: stats.favorites,
        pokedexCount,
    };
}

/**
 * How many cards the Pokédex holds, for its row in the sidebar and its tile among the binders.
 *
 * The Pokédex is a binder with a rule of its own (the range and the rarities from the profile),
 * and its count is what a rule binder's is: the copies the rule keeps, the number its own page
 * says at the top. No API answers that in one number, and the rule is applied here (dex-groups.ts,
 * the "Ultra Rare" split), so it is counted from every card you own. That read is the heaviest the
 * app makes, which is why the sidebar does not prefetch the Pokédex; so the number, and nothing
 * else of the read, is kept five minutes per person with the folders, and a write drops it with
 * them (forgetMine). Keyed by the setting too: a change of range or rarities is a different count.
 *
 * Fails soft as the folders do: null draws the row without a number.
 */
export async function getPokedexCount(): Promise<number | null> {
    try {
        const setting = (await getMyProfile()).profile?.pokedex ?? DEFAULT_POKEDEX;
        return await perUser(`pokedex-count:${JSON.stringify(setting)}`, async (token) => {
            const { cards } = await getAllMyCards({ facets: false }, token);
            // The names are for the slots the page draws; a count needs none of them.
            return groupByDex(cards, new Map(), setting).copies;
        });
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err;
        console.error("Cards unavailable, the Pokédex drawn without its count:", err instanceof Error ? err.message : err);
        return null;
    }
}

/**
 * The folder names and their counts, for the sidebar. Fails soft: a sidebar without its folders is a poorer page,
 * a thrown error is no page at all, and on 2026-09-04 a catalogue outage took every screen down
 * through this one read. A 401 still throws: that is the session, not the folders.
 */
export async function getMyFolders(): Promise<{ id: string; name: string; kind: FolderKind; count: number }[]> {
    try {
        return (await folders()).map((f) => ({ id: f.id, name: f.name, kind: f.kind, count: f.count }));
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err;
        console.error("Folders unavailable, sidebar drawn without them:", err instanceof Error ? err.message : err);
        return [];
    }
}

/**
 * How many cards you have starred, for the sidebar's Favorites row. Fails soft as the folders
 * do: null draws the row without a number. The stats are cached with the folders, under the
 * same tag, so the frame pays this read once per five minutes and after a write.
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

export type CollectionDetail = { id: string; name: string; kind: FolderKind; rule: FolderRule | null; pokedex: PokedexSetting | null; isPublic: boolean };

export async function getCollection(id: string): Promise<CollectionDetail | null> {
    const found = (await folders()).find((f) => f.id === id);
    return found ? { id: found.id, name: found.name, kind: found.kind, rule: found.rule, pokedex: found.pokedex, isPublic: found.isPublic } : null;
}
