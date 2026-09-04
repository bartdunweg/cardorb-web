import { ApiError, api } from "@/lib/api";
import { type PublicCard, type PublicItem, publicCardFromItem } from "@/lib/api-shapes";

export type PublicProfile = { display_name: string | null; username: string | null; avatar_url: string | null };

// The public face of a profile, or null when there is none by that name or it is not public.
// Unkeyed: the API's three public routes serve exactly this page and carry no prices.
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
    try {
        const p = await api<{ username: string; displayName: string | null; avatarUrl: string | null }>(`/public/${encodeURIComponent(username)}/profile`, {
            auth: false,
        });
        return { display_name: p.displayName, username: p.username, avatar_url: p.avatarUrl };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}

export const PUBLIC_PAGE_SIZE = 100;

// One page of the owned cards behind a public profile, with the totals behind it, narrowed by a
// search on name or set when `q` is given. The paged route rather than the whole collection: a
// hundred tiles need thirty kilobytes, not nine hundred. The API publishes nothing personal on it
// (R-API-002 there), so nothing here has to be hidden.
export async function getPublicCards(
    username: string,
    { page = 1, q }: { page?: number; q?: string } = {},
): Promise<{ cards: PublicCard[]; total: number; sets: number }> {
    const { cards, total, sets } = await api<{ cards: PublicItem[]; total: number; sets: number }>(`/public/${encodeURIComponent(username)}/cards`, {
        auth: false,
        params: { q, limit: PUBLIC_PAGE_SIZE, offset: (page - 1) * PUBLIC_PAGE_SIZE },
    });
    return { cards: cards.map(publicCardFromItem), total, sets };
}
