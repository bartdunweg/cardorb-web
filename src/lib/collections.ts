import { cache } from "react";
import { api } from "@/lib/api";
import { getStats } from "@/lib/cards";

export type CollectionSummary = { id: string; name: string; count: number };

type Folder = { id: string; name: string; createdAt: string; count: number };

// The API calls them folders — "collection" is the whole of what you own there — and the
// screens keep calling them collections. Read once per request: the layout and the page both ask.
const folders = cache(async () => (await api<{ folders: Folder[] }>("/folders")).folders);

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
