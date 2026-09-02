import { api } from "@/lib/api";
import { getStats } from "@/lib/cards";
import { perUser } from "@/lib/user-cache";

export type CollectionSummary = { id: string; name: string; count: number };

type Folder = { id: string; name: string; createdAt: string; count: number };

// The API calls them folders — "collection" is the whole of what you own there — and the
// screens keep calling them collections. Kept five minutes per person: the layout asks on every
// screen, and every write to a folder or a card drops the cache.
const folders = () => perUser("folders", async (token) => (await api<{ folders: Folder[] }>("/folders", { token })).folders);

export async function getMyCollections(): Promise<{ collections: CollectionSummary[]; favoritesCount: number; wishlistCount: number }> {
    const [list, stats] = await Promise.all([folders(), getStats()]);
    return {
        collections: list.map((f) => ({ id: f.id, name: f.name, count: f.count })),
        favoritesCount: stats.favorites,
        wishlistCount: stats.wishlist,
    };
}

export async function getCollection(id: string): Promise<{ id: string; name: string } | null> {
    const found = (await folders()).find((f) => f.id === id);
    return found ? { id: found.id, name: found.name } : null;
}
