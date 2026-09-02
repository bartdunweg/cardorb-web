import { ApiError, api } from "@/lib/api";
import { type PublicCard, type PublicSet, publicCardsFromSets } from "@/lib/api-shapes";

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

const SHOWN = 100;

// The owned collection behind a public profile. The API publishes rarity and ownership of each copy
// and nothing personal (R-API-002 there), so nothing here has to be hidden.
export async function getPublicCards(username: string): Promise<{ cards: PublicCard[]; total: number; sets: number }> {
    const { sets } = await api<{ sets: PublicSet[] }>(`/public/${encodeURIComponent(username)}/collection`, { auth: false });
    const cards = publicCardsFromSets(sets);
    const ownedSets = sets.filter((set) => set.cards.some((card) => card.variants.some((v) => v.owned))).length;
    return { cards: cards.slice(0, SHOWN), total: cards.length, sets: ownedSets };
}
