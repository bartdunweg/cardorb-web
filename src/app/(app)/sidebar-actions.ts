"use server";

import { getFavoritesCount, getMyFolders } from "@/lib/collections";

/**
 * The sidebar's numbers, read again: every binder's count and the favourites'.
 *
 * For after the minus and the plus on a list's tiles, which write without drawing the page again
 * (a redrawn list starts over from its first batch). The layout's own read was from before the
 * presses, so the sidebar asks for its numbers on its own. Nothing is forgotten or revalidated
 * here, so nothing is drawn again either: the answer is data, and the sidebar puts it in place.
 * The cache was dropped by /api/forget-mine before this is asked, so the reads are fresh.
 */
export async function sidebarCounts(): Promise<{
    collections: { id: string; name: string; kind: "manual" | "rule"; count: number }[];
    favorites: number | null;
}> {
    const [collections, favorites] = await Promise.all([getMyFolders().catch(() => []), getFavoritesCount().catch(() => null)]);
    return { collections, favorites };
}
