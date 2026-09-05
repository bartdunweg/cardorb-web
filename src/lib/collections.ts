import { ApiError, api } from "@/lib/api";
import { type Folder, type FolderItem, folderFromApi } from "@/lib/api-shapes";
import { getStats } from "@/lib/cards";
import type { FolderKind, FolderRule } from "@/lib/folder-rule";
import { perUser } from "@/lib/user-cache";

export type CollectionSummary = { id: string; name: string; count: number; kind: FolderKind; rule: FolderRule | null };

// The API calls them folders — "collection" is the whole of what you own there — and the
// screens keep calling them collections. Kept five minutes per person: the layout asks on every
// screen, and every write to a folder or a card drops the cache.
const folders = (): Promise<Folder[]> =>
    perUser("folders", async (token) => (await api<{ folders: FolderItem[] }>("/folders", { token })).folders.map(folderFromApi));

export async function getMyCollections(): Promise<{ collections: CollectionSummary[]; favoritesCount: number; wishlistCount: number }> {
    const [list, stats] = await Promise.all([folders(), getStats()]);
    return {
        collections: list.map((f) => ({ id: f.id, name: f.name, count: f.count, kind: f.kind, rule: f.rule })),
        favoritesCount: stats.favorites,
        wishlistCount: stats.wishlist,
    };
}

/**
 * The folder names, for the sidebar. Fails soft: a sidebar without its folders is a poorer page,
 * a thrown error is no page at all, and on 2026-09-04 a catalogue outage took every screen down
 * through this one read. A 401 still throws: that is the session, not the folders.
 */
export async function getMyFolders(): Promise<{ id: string; name: string }[]> {
    try {
        return (await folders()).map((f) => ({ id: f.id, name: f.name }));
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) throw err;
        console.error("Folders unavailable, sidebar drawn without them:", err instanceof Error ? err.message : err);
        return [];
    }
}

export type CollectionDetail = { id: string; name: string; kind: FolderKind; rule: FolderRule | null };

export async function getCollection(id: string): Promise<CollectionDetail | null> {
    const found = (await folders()).find((f) => f.id === id);
    return found ? { id: found.id, name: found.name, kind: found.kind, rule: found.rule } : null;
}
