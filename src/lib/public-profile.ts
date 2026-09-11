import { ApiError, api } from "@/lib/api";
import {
    type PublicCard,
    type PublicItem,
    publicCardFromItem,
    publicCardsAnswer,
    publicFoldersAnswer,
    publicProfileAnswer,
    publicTotalAnswer,
} from "@/lib/api-shapes";
import { type Facets, facetsFrom } from "@/lib/facets";
import type { PokedexSetting } from "@/lib/folder-rule";
import type { ListQuery } from "@/lib/list-query";
import { publicTag } from "@/lib/user-cache";

/**
 * What a visitor sees of someone else's collection, read from the API's public routes.
 *
 * Every read here is unkeyed, so it is cached for five minutes, and every one carries the owner's
 * tag (`publicTag`): the moment they make the profile private, or take a copy off it, the write
 * drops the lot. Without the tag the page went on answering out of the cache — a profile turned
 * private and still readable for five minutes, which is the one thing a public page must get right.
 */
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
        const p = await api(`/public/${encodeURIComponent(username)}/profile`, { auth: false, tags: [publicTag(username)], schema: publicProfileAnswer });
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

export const PUBLIC_PAGE_SIZE = 100;

export type PublicCardsPage = { cards: PublicCard[]; total: number; copies?: number; facets: Facets };

// One page of the owned cards behind a public profile, narrowed and sorted as the URL says, with
// the totals and the facets over the whole collection behind it. The paged route rather than the
// whole collection: a hundred tiles need thirty kilobytes, not nine hundred. The API publishes
// nothing personal on it (R-API-002 there), so nothing here has to be hidden.
export async function getPublicCards(username: string, { page, q, set, rarity, sort, order, folder, list }: ListQuery): Promise<PublicCardsPage> {
    const { cards, total, copies, facets } = await api(`/public/${encodeURIComponent(username)}/cards`, {
        auth: false,
        tags: [publicTag(username)],
        params: { q, set, rarity, sort, order, collection: folder, list, limit: PUBLIC_PAGE_SIZE, offset: (page - 1) * PUBLIC_PAGE_SIZE },
        schema: publicCardsAnswer,
    });
    return {
        cards: cards.map(publicCardFromItem),
        total,
        copies,
        facets: facetsFrom(facets),
    };
}

/** The maximum the public route hands out at once; the Pokédex needs every card, so it pages through at this size. */
const ALL_PAGE_SIZE = 500;

// Every owned card behind a public profile, for the page that draws them as a Pokédex: the slots
// need all of them, not a page. The first page says how many there are; the rest come at once.
export async function getAllPublicCards(username: string, query: ListQuery): Promise<{ cards: PublicCard[]; total: number; copies?: number; facets: Facets }> {
    const read = async (offset: number) =>
        api(`/public/${encodeURIComponent(username)}/cards`, {
            auth: false,
            tags: [publicTag(username)],
            params: { q: query.q, set: query.set, rarity: query.rarity, list: "pokedex", limit: ALL_PAGE_SIZE, offset },
            schema: publicCardsAnswer,
        });
    const first = await read(0);
    const rest = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.total / ALL_PAGE_SIZE) - 1) }, (_, i) => read((i + 1) * ALL_PAGE_SIZE)));
    return {
        cards: [first, ...rest].flatMap((p) => p.cards).map(publicCardFromItem),
        total: first.total,
        copies: first.copies,
        facets: facetsFrom(first.facets),
    };
}

/** A folder its owner shows on the profile: a chip over the list, with how many cards it holds. */
export type PublicFolder = { id: string; name: string; kind: "manual" | "rule"; count: number };

// The folders a person shows, oldest first; none when they show none. Fails soft to none: a
// profile without its chips is a poorer page, and an API from before the route answers 404.
export async function getPublicFolders(username: string): Promise<PublicFolder[]> {
    try {
        const { folders } = await api(`/public/${encodeURIComponent(username)}/folders`, {
            auth: false,
            tags: [publicTag(username)],
            schema: publicFoldersAnswer,
        });
        return folders;
    } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 503)) return [];
        throw err;
    }
}

// How many cards a public list holds, and nothing else: one item asked for, the count read off it.
// For the line under the name, which counts the collection and the wishlist whatever list is open.
// Copies — the list as a person counts it — where the API says them; the rows from one before it did.
export async function countPublicCards(username: string, list?: "wishlist" | "favorites" | "pokedex"): Promise<number> {
    const { total, copies } = await api(`/public/${encodeURIComponent(username)}/cards`, {
        auth: false,
        tags: [publicTag(username)],
        params: { list, limit: 1 },
        schema: publicTotalAnswer,
    });
    return copies ?? total;
}
