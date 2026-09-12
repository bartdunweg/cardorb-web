import { ApiError, api } from "@/lib/api";
import { type Folder, type FolderItem, folderFromApi, foldersAnswer } from "@/lib/api-shapes";
import { getStats } from "@/lib/cards";
import type { FolderKind, FolderRule, PokedexSetting } from "@/lib/folder-rule";
import { perUser } from "@/lib/user-cache";

export type CollectionSummary = { id: string; name: string; count: number; kind: FolderKind; rule: FolderRule | null };

// The API calls them folders ("collection" is the whole of what you own there) and the
// screens keep calling them collections. Kept five minutes per person: the layout asks on every
// screen, and every write to a folder or a card drops the cache.
const folders = (): Promise<Folder[]> =>
    perUser("folders", async (token) => (await api("/folders", { token, schema: foldersAnswer })).folders.map(folderFromApi));

export async function getMyCollections(): Promise<{
    collections: CollectionSummary[];
    ownedCount: number;
    favoritesCount: number;
}> {
    const [list, stats] = await Promise.all([folders(), getStats()]);
    return {
        collections: list.map((f) => ({ id: f.id, name: f.name, count: f.count, kind: f.kind, rule: f.rule })),
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
    const found = (await folders()).find((f) => f.pokedex);
    return found?.pokedex ? { id: found.id, name: found.name, pokedex: found.pokedex } : null;
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
