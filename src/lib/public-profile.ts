import { cache } from "react";
import { ApiError, api } from "@/lib/api";
import { type PublicCard, publicBindersAnswer, publicCardFromItem, publicCardsAnswer, publicProfileAnswer, publicTotalAnswer } from "@/lib/api-shapes";
import type { PokedexSetting } from "@/lib/binder-rule";
import { type Facets, facetsFrom } from "@/lib/facets";
import { type ListQuery, isNarrowed } from "@/lib/list-query";
import { publicTag } from "@/lib/user-cache";

/**
 * What a visitor sees of someone else's collection, read from the API's public routes.
 *
 * Every read here is unkeyed, so it is cached for five minutes, and every one carries the owner's
 * tag (`publicTag`): the moment they make the profile private, or take a copy off it, the write
 * drops the lot. Without the tag the page went on answering out of the cache: a profile turned
 * private and still readable for five minutes, which is the one thing a public page must get right.
 *
 * The five-minute cache does not make a second call in one request free: `api()` gives each fetch
 * a timeout signal, and Next does not dedupe a fetch that carries one. So a read both the metadata
 * and the page make goes through React's `cache`, once per request.
 */
export type PublicProfile = {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    wishlist_public: boolean;
    favorites_public: boolean;
    /** The owner shows prices: the cards carry one and the lists say their worth. */
    prices_public: boolean;
};

// The public face of a profile, or null when there is none by that name or it is not public.
// Unkeyed: the API's public routes serve exactly this page, and carry a price only where the owner shows them.
export const getPublicProfile = cache(async (username: string): Promise<PublicProfile | null> => {
    try {
        const p = await api(`/public/${encodeURIComponent(username)}/profile`, { auth: false, tags: [publicTag(username)], schema: publicProfileAnswer });
        return {
            display_name: p.displayName,
            username: p.username,
            avatar_url: p.avatarUrl,
            wishlist_public: p.wishlistPublic ?? false,
            favorites_public: p.favoritesPublic ?? false,
            prices_public: p.pricesPublic ?? false,
        };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
});

export const PUBLIC_PAGE_SIZE = 100;

/** `value` and `unpriced` only where the owner shows prices: euros over the whole list, and the copies without one. */
export type PublicCardsPage = { cards: PublicCard[]; total: number; copies?: number; facets: Facets; value?: number; unpriced?: number };

// One page of the owned cards behind a public profile, narrowed and sorted as the URL says, with
// the totals and the facets over the whole collection behind it. The paged route rather than the
// whole collection: a hundred tiles need thirty kilobytes, not nine hundred. The API publishes
// nothing personal on it (R-API-002 there), so nothing here has to be hidden.
export async function getPublicCards(username: string, { page, q, set, rarity, sort, order, folder, list }: ListQuery): Promise<PublicCardsPage> {
    const { cards, total, copies, facets, value, unpriced } = await api(`/public/${encodeURIComponent(username)}/cards`, {
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
        value,
        unpriced,
    };
}

/** The maximum the public route hands out at once; a Pokédex binder needs every card, so it pages through at this size. */
const ALL_PAGE_SIZE = 500;

// Every owned card behind a public profile, for the page that draws them as a Pokédex: the slots
// need all of them, not a page. The first page says how many there are; the rest come at once.
// `facets` is ready with the first page, so the row above the slots need not wait for the rest.
export function readAllPublicCards(username: string, query: ListQuery): { facets: Promise<Facets>; all: Promise<PublicCardsPage> } {
    const read = async (offset: number) =>
        api(`/public/${encodeURIComponent(username)}/cards`, {
            auth: false,
            tags: [publicTag(username)],
            // The binder itself, not a list of its own: the Pokédex stopped being one of those when it
            // became a binder. Its being public is the binder's own flag, which the API checks.
            params: { q: query.q, set: query.set, rarity: query.rarity, collection: query.folder, limit: ALL_PAGE_SIZE, offset },
            schema: publicCardsAnswer,
        });
    const firstPage = read(0);
    const all = firstPage.then(async (first) => {
        const rest = await Promise.all(
            Array.from({ length: Math.max(0, Math.ceil(first.total / ALL_PAGE_SIZE) - 1) }, (_, i) => read((i + 1) * ALL_PAGE_SIZE)),
        );
        return {
            cards: [first, ...rest].flatMap((p) => p.cards).map(publicCardFromItem),
            total: first.total,
            copies: first.copies,
            facets: facetsFrom(first.facets),
            value: first.value,
            unpriced: first.unpriced,
        };
    });
    // A failure still reaches whoever awaits `all`; this only keeps it from counting as unhandled
    // while the page is still waiting on the facets or another read that failed first.
    all.catch(() => undefined);
    return { facets: firstPage.then((first) => facetsFrom(first.facets)), all };
}

export const getAllPublicCards = (username: string, query: ListQuery): Promise<PublicCardsPage> => readAllPublicCards(username, query).all;

/** A binder its owner shows on the profile: a chip over the list, with how many cards it holds. */
export type PublicBinder = {
    id: string;
    name: string;
    kind: "manual" | "rule";
    count: number;
    /** Set where the binder is shown as a Pokédex: the visitor's page draws its slots, not a list. */
    pokedex: PokedexSetting | null;
};

// The binders a person shows, oldest first; none when they show none. Fails soft to none: a
// profile without its chips is a poorer page, and an API from before the route answers 404.
export const getPublicBinders = cache(async (username: string): Promise<PublicBinder[]> => {
    try {
        const { folders: binders } = await api(`/public/${encodeURIComponent(username)}/folders`, {
            auth: false,
            tags: [publicTag(username)],
            schema: publicBindersAnswer,
        });
        return binders.map((f) => ({ ...f, pokedex: f.pokedex ?? null }));
    } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 503)) return [];
        throw err;
    }
});

// How many cards a public list holds and what they are worth, and nothing else: one item asked
// for, the numbers read off it. For the line under the name, which counts the collection and the
// wishlist whatever list is open. Copies (the list as a person counts it) where the API says them;
// the rows from one before it did. The value only where the owner shows prices, null otherwise.
export async function countPublicCards(username: string, list?: "wishlist" | "favorites"): Promise<{ count: number; value: number | null }> {
    const { total, copies, value } = await api(`/public/${encodeURIComponent(username)}/cards`, {
        auth: false,
        tags: [publicTag(username)],
        params: { list, limit: 1 },
        schema: publicTotalAnswer,
    });
    return { count: copies ?? total, value: value ?? null };
}

export type PublicCount = Awaited<ReturnType<typeof countPublicCards>>;

/** What the visitor's page reads for one list, each part in the fewest calls that answer it. */
export type PublicListReads = {
    binders: PublicBinder[];
    /** The binder the URL names, where the owner shows it. */
    binder: PublicBinder | null;
    /** The page of cards; null for a Pokédex binder, which reads every card in `dex` instead. */
    page: PublicCardsPage | null;
    facets: Facets;
    /** Every card of a Pokédex binder, still arriving; null for any other list. */
    dex: Promise<PublicCardsPage> | null;
    /** The whole collection, for the line under the name. */
    owned: PublicCount;
    /** The whole wishlist, where the owner shows it. */
    wishes: PublicCount | null;
};

/**
 * The reads behind one visit, without asking the API anything twice:
 * - a Pokédex binder reads every card, and its first page carries the facets, so the paged read
 *   (whose cards it would not draw) is not made;
 * - the collection as it opens, nothing searched, filtered or chosen, is exactly what the line
 *   under the name counts, so its count and worth come off the paged read instead of a second call.
 */
export async function readPublicList(username: string, query: ListQuery, { wishlistPublic }: { wishlistPublic: boolean }): Promise<PublicListReads> {
    const bindersRead = getPublicBinders(username);
    // Only a binder in the URL can be a Pokédex, so only then does the list wait on the binders.
    const binderRead = query.folder ? bindersRead.then((binders) => binders.find((f) => f.id === query.folder) ?? null) : Promise.resolve(null);
    const dexRead = binderRead.then((binder) => (binder?.pokedex ? readAllPublicCards(username, query) : null));
    const pageRead = binderRead.then((binder) => (binder?.pokedex ? null : getPublicCards(username, query)));
    const whole = !isNarrowed(query) && !query.folder && !query.list;
    const ownedRead: Promise<PublicCount> = whole
        ? pageRead.then((page) => (page ? { count: page.copies ?? page.total, value: page.value ?? null } : countPublicCards(username)))
        : countPublicCards(username);
    const [binders, binder, page, dex, owned, wishes] = await Promise.all([
        bindersRead,
        binderRead,
        pageRead,
        dexRead,
        ownedRead,
        wishlistPublic ? countPublicCards(username, "wishlist") : Promise.resolve(null),
    ]);
    const facets = page ? page.facets : dex ? await dex.facets : facetsFrom(undefined);
    return { binders, binder, page, facets, dex: dex?.all ?? null, owned, wishes };
}
