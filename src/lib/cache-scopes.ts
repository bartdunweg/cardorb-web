import { z } from "zod";

/**
 * What a person's cached reads are filed under, and what each kind of write forgets.
 *
 * Plain data with no server import, so the client can name the write it made when it asks
 * `/api/forget-mine` to forget, and the route can check that name.
 *
 * Every read carries two tags: the person's (`user:<id>`), which forgetting everything drops, and
 * its scope's (`user:<id>:<scope>`), which a write that changes only that part drops. Both stay
 * per user id, because the cards table holds other accounts.
 *
 * - `profile`: the profile, its public flags and the picture.
 * - `binders`: the binder list, with each binder's count and rule.
 * - `lists`: every list's first batch (the collection, the wishlist, a binder, Favorites).
 * - `stats`: whole-collection numbers: the stats, the facets, Home's top cards and Pokémon count.
 * - `sets`: Browse's shelf and every set page, with the marks and counts of what you hold.
 * - `value`: the value line and the movers, for the collection and per list.
 */
export const CACHE_SCOPES = ["profile", "binders", "lists", "stats", "sets", "value"] as const;
export type CacheScope = (typeof CACHE_SCOPES)[number];

/**
 * The writes this app makes, by what they change. `all` is for a write whose reach is not clear
 * (an import) and for an old caller that names nothing.
 */
export const FORGET_WRITES = ["all", "cards", "favorite", "binders", "profile", "dexFace"] as const;
export const forgetWriteSchema = z.enum(FORGET_WRITES);
export type ForgetWrite = z.infer<typeof forgetWriteSchema>;

/**
 * What each write forgets.
 *
 * A card written (added, removed, a count, a copy edited, filed, a wish) changes the lists,
 * the numbers, the binders' counts, the set marks and the value; never the profile.
 * A star (`favorite`) changes less: the Favorites list and the star on every list, the favorites
 * count (it is in the stats, and the sidebar's Favorites row reads it there) and the Favorites value
 * line Home can show. No binder holds a card by its star and no set page shows one, so the binders
 * and the sets stay. A binder made,
 * edited or deleted changes the binder list, which cards a binder's list holds, and that binder's
 * value line; its Pokédex setting is part of the Pokémon count's key, so that count needs no forget.
 * A profile write changes the profile alone; the public pages go with every write (`publicTag`).
 * A Pokédex face chosen (`dexFace`) changes which card a slot shows, which is kept with a Pokédex
 * binder's cards in the lists; no count and no value.
 */
export const FORGETS: Record<Exclude<ForgetWrite, "all">, readonly CacheScope[]> = {
    cards: ["lists", "stats", "binders", "sets", "value"],
    favorite: ["lists", "stats", "value"],
    binders: ["binders", "lists", "value"],
    profile: ["profile"],
    dexFace: ["lists"],
};

export const userTag = (userId: string) => `user:${userId}`;
export const scopeTag = (userId: string, scope: CacheScope) => `user:${userId}:${scope}`;

/** The tags one read is filed under. */
export const readTags = (userId: string, scope: CacheScope) => [userTag(userId), scopeTag(userId, scope)];

/** The scopes a write forgets: every one for `all`. */
export const scopesForgotten = (write: ForgetWrite): readonly CacheScope[] => (write === "all" ? CACHE_SCOPES : FORGETS[write]);

/** The tags a write drops: the person's own for `all`, which every read carries, else one per scope. */
export const forgetTags = (userId: string, write: ForgetWrite): string[] =>
    write === "all" ? [userTag(userId)] : FORGETS[write].map((scope) => scopeTag(userId, scope));
