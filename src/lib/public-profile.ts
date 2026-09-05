import { ApiError, api } from "@/lib/api";
import { type PublicCard, type PublicItem, publicCardFromItem } from "@/lib/api-shapes";
import type { Facets } from "@/lib/cards";
import type { ListQuery } from "@/lib/list-query";

export type PublicProfile = { display_name: string | null; username: string | null; avatar_url: string | null; wishlist_public: boolean };

// The public face of a profile, or null when there is none by that name or it is not public.
// Unkeyed: the API's three public routes serve exactly this page and carry no prices.
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
    try {
        const p = await api<{ username: string; displayName: string | null; avatarUrl: string | null; wishlistPublic?: boolean }>(
            `/public/${encodeURIComponent(username)}/profile`,
            { auth: false },
        );
        return { display_name: p.displayName, username: p.username, avatar_url: p.avatarUrl, wishlist_public: p.wishlistPublic ?? false };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}

export const PUBLIC_PAGE_SIZE = 100;

export type PublicCardsPage = { cards: PublicCard[]; total: number; sets: number; facets: Facets };

// One page of the owned cards behind a public profile, narrowed and sorted as the URL says, with
// the totals and the facets over the whole collection behind it. The paged route rather than the
// whole collection: a hundred tiles need thirty kilobytes, not nine hundred. The API publishes
// nothing personal on it (R-API-002 there), so nothing here has to be hidden.
export async function getPublicCards(username: string, { page, q, set, rarity, sort, order, folder, list }: ListQuery): Promise<PublicCardsPage> {
    const { cards, total, sets, facets } = await api<{ cards: PublicItem[]; total: number; sets: number; facets?: Facets }>(
        `/public/${encodeURIComponent(username)}/cards`,
        {
            auth: false,
            params: { q, set, rarity, sort, order, collection: folder, list, limit: PUBLIC_PAGE_SIZE, offset: (page - 1) * PUBLIC_PAGE_SIZE },
        },
    );
    // This route is cached for five minutes (no session, so `revalidate`), and an answer cached before
    // the API carried facets has none. Empty menus for those minutes, not a broken page.
    return { cards: cards.map(publicCardFromItem), total, sets, facets: facets ?? { sets: [], rarities: [] } };
}

/** A folder its owner shows on the profile: a chip over the list, with how many cards it holds. */
export type PublicFolder = { id: string; name: string; kind: "manual" | "rule"; count: number };

// The folders a person shows, oldest first; none when they show none. Fails soft to none: a
// profile without its chips is a poorer page, and an API from before the route answers 404.
export async function getPublicFolders(username: string): Promise<PublicFolder[]> {
    try {
        const { folders } = await api<{ folders: PublicFolder[] }>(`/public/${encodeURIComponent(username)}/folders`, { auth: false });
        return folders;
    } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 503)) return [];
        throw err;
    }
}
