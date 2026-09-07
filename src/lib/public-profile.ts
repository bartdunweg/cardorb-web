import { ApiError, api } from "@/lib/api";
import { type PublicCard, type PublicItem, absoluteImage, publicCardFromItem } from "@/lib/api-shapes";
import type { Facets } from "@/lib/cards";
import type { PokedexSetting } from "@/lib/folder-rule";
import type { ListQuery } from "@/lib/list-query";

export type PublicProfile = {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    wishlist_public: boolean;
    favorites_public: boolean;
    pokedex_public: boolean;
    /** The owner's Pokédex setting, while the Pokédex is shown; null otherwise. */
    pokedex: PokedexSetting | null;
};

// The public face of a profile, or null when there is none by that name or it is not public.
// Unkeyed: the API's three public routes serve exactly this page and carry no prices.
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
    try {
        const p = await api<{
            username: string;
            displayName: string | null;
            avatarUrl: string | null;
            wishlistPublic?: boolean;
            favoritesPublic?: boolean;
            pokedexPublic?: boolean;
            pokedex?: PokedexSetting | null;
        }>(`/public/${encodeURIComponent(username)}/profile`, { auth: false });
        return {
            display_name: p.displayName,
            username: p.username,
            avatar_url: p.avatarUrl,
            wishlist_public: p.wishlistPublic ?? false,
            favorites_public: p.favoritesPublic ?? false,
            pokedex_public: p.pokedexPublic ?? false,
            pokedex: p.pokedex ?? null,
        };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}

/** The newest card the owner added and dated, for the line at the top of their page. */
export type LatestPull = {
    name: string;
    number: string;
    set_name: string;
    rarity: string | null;
    image_url: string | null;
    acquired_at: string;
};

/**
 * The most recent addition, or null when there is none to show.
 *
 * Decoration on somebody else's page: a 404 (nothing dated yet) and a failure both mean the line
 * stays out, rather than a profile that will not render because one extra read went wrong.
 */
export async function getLatestPull(username: string): Promise<LatestPull | null> {
    try {
        const { latestPull: p } = await api<{
            latestPull: { name: string; number: string; setTitle: string; setName: string; rarity: string | null; image: string | null; acquiredAt: string };
        }>(`/public/${encodeURIComponent(username)}/latest-pull`, { auth: false });
        return {
            name: p.name,
            number: p.number,
            set_name: p.setTitle || p.setName,
            rarity: p.rarity,
            image_url: absoluteImage(p.image),
            acquired_at: p.acquiredAt,
        };
    } catch {
        return null;
    }
}

export const PUBLIC_PAGE_SIZE = 100;

export type PublicCardsPage = { cards: PublicCard[]; total: number; facets: Facets };

// One page of the owned cards behind a public profile, narrowed and sorted as the URL says, with
// the totals and the facets over the whole collection behind it. The paged route rather than the
// whole collection: a hundred tiles need thirty kilobytes, not nine hundred. The API publishes
// nothing personal on it (R-API-002 there), so nothing here has to be hidden.
export async function getPublicCards(username: string, { page, q, set, rarity, sort, order, folder, list }: ListQuery): Promise<PublicCardsPage> {
    const { cards, total, facets } = await api<{ cards: PublicItem[]; total: number; facets?: Facets }>(`/public/${encodeURIComponent(username)}/cards`, {
        auth: false,
        params: { q, set, rarity, sort, order, collection: folder, list, limit: PUBLIC_PAGE_SIZE, offset: (page - 1) * PUBLIC_PAGE_SIZE },
    });
    // This route is cached for five minutes (no session, so `revalidate`), and an answer cached before
    // the API carried facets has none. Empty menus for those minutes, not a broken page.
    return {
        cards: cards.map(publicCardFromItem),
        total,
        facets: { sets: facets?.sets ?? [], rarities: facets?.rarities ?? [], gens: facets?.gens ?? [], types: facets?.types ?? [] },
    };
}

/** The maximum the public route hands out at once; the Pokédex needs every card, so it pages through at this size. */
const ALL_PAGE_SIZE = 500;

// Every owned card behind a public profile, for the page that draws them as a Pokédex: the slots
// need all of them, not a page. The first page says how many there are; the rest come at once.
export async function getAllPublicCards(username: string, query: ListQuery): Promise<{ cards: PublicCard[]; total: number; facets: Facets }> {
    const read = async (offset: number) =>
        api<{ cards: PublicItem[]; total: number; facets?: Facets }>(`/public/${encodeURIComponent(username)}/cards`, {
            auth: false,
            params: { q: query.q, set: query.set, rarity: query.rarity, list: "pokedex", limit: ALL_PAGE_SIZE, offset },
        });
    const first = await read(0);
    const rest = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.total / ALL_PAGE_SIZE) - 1) }, (_, i) => read((i + 1) * ALL_PAGE_SIZE)));
    return {
        cards: [first, ...rest].flatMap((p) => p.cards).map(publicCardFromItem),
        total: first.total,
        facets: {
            sets: first.facets?.sets ?? [],
            rarities: first.facets?.rarities ?? [],
            gens: first.facets?.gens ?? [],
            types: first.facets?.types ?? [],
        },
    };
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

// How many cards a public list holds, and nothing else: one item asked for, the total read off it.
// For the line under the name, which counts the collection and the wishlist whatever list is open.
export async function countPublicCards(username: string, list?: "wishlist" | "favorites" | "pokedex"): Promise<number> {
    const { total } = await api<{ total: number }>(`/public/${encodeURIComponent(username)}/cards`, { auth: false, params: { list, limit: 1 } });
    return total;
}
