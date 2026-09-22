import { z } from "zod";

/**
 * What a person's cached reads are filed under, and what each kind of write forgets.
 *
 * Plain data with no server import, so the client can name the write it made when it asks
 * `/api/forget-mine` to forget, and the route can check that name.
 *
 * Every read carries two tags: the person's (`user:<id>`), which forgetting everything drops, and
 * its scope's (`user:<id>:<scope>`), which a write that changes only that part drops. A read in a
 * parted scope carries a third, its piece's (`PARTED_SCOPES`). All stay per user id, because the
 * cards table holds other accounts.
 *
 * - `profile`: the profile, its public flags and the picture.
 * - `binders`: the binder list, with each binder's count and rule.
 * - `lists`: every list's first batch (the collection, the wishlist, a binder, Favorites), and Home's
 *   numbers for a chosen list (its dearest cards, its sets and Pokémon), which a binder edit must forget too.
 * - `stats`: the collection's counts, the `/stats` read. A star moves one of them (Favorites), so a
 *   star forgets this scope and the one below it stands.
 * - `holdings`: what you hold, counted and sorted, which no flag on a card moves: the filter facets,
 *   Home's dearest cards over the whole collection and its Pokémon count. Only a card write changes these.
 * - `sets`: Browse's shelf, with the counts on its tiles.
 * - `setPages`: one set's page, the marks and counts of what you hold in it. Parted by set id, so a
 *   card write that names its set drops that one page and leaves every other set's standing.
 * - `value`: the value line and the movers, for the collection and per list.
 */
export const CACHE_SCOPES = ["profile", "binders", "lists", "stats", "holdings", "sets", "setPages", "value"] as const;
export type CacheScope = (typeof CACHE_SCOPES)[number];

/**
 * The scopes kept in pieces: a read in one names the piece it belongs to, and a write that knows
 * which piece it changed drops that piece alone. A write that does not know drops the whole scope.
 */
export const PARTED_SCOPES = ["setPages"] as const;
export type PartedScope = (typeof PARTED_SCOPES)[number];

const isParted = (scope: CacheScope): scope is PartedScope => (PARTED_SCOPES as readonly string[]).includes(scope);

/** Where one read is filed: a scope, or one piece of a parted scope. */
export type ScopeRef = CacheScope | { scope: PartedScope; part: string };

/** The scope a ref belongs to, parted or not. */
export const scopeOf = (ref: ScopeRef): CacheScope => (typeof ref === "string" ? ref : ref.scope);

/** A ref as one string: the name a request's own reads and a scope's mark go by. */
export const refKey = (ref: ScopeRef): string => (typeof ref === "string" ? ref : `${ref.scope}:${ref.part}`);

/**
 * The writes this app makes, by what they change. `all` is for a write whose reach is not clear
 * (an import) and for an old caller that names nothing.
 */
export const FORGET_WRITES = ["all", "cards", "favorite", "binders", "profile", "dexFace"] as const;
export const forgetWriteSchema = z.enum(FORGET_WRITES);
export type ForgetWrite = z.infer<typeof forgetWriteSchema>;

/**
 * The set a write names, where it knows it. Checked because it reaches a cache tag: a set id is a
 * catalogue id (`sv1`, `base1`, `sv3pt5`), never a colon or a path.
 */
export const forgetSetSchema = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/);

/**
 * What each write forgets.
 *
 * A card written (added, removed, a count, a copy edited, filed, a wish) changes the lists, the
 * counts, what you hold, the binders' counts, the shelf, the page of the set it is in and the
 * value; never the profile.
 * A star (`favorite`) changes less: the Favorites list and the star on every list, the favorites
 * count (it is in the stats, and the sidebar's Favorites row reads it there) and the Favorites value
 * line Home can show. No filter facet, no dearest card and no Pokémon count follows a star, so
 * `holdings` stands; no binder holds a card by its star and no set page shows one, so the binders,
 * the shelf and the set pages stand. A binder made,
 * edited or deleted changes the binder list, which cards a binder's list holds, and that binder's
 * value line; its Pokédex setting is part of the Pokémon count's key, so that count needs no forget.
 * A profile write changes the profile alone; the public pages go with every write (`publicTag`).
 * A Pokédex face chosen (`dexFace`) changes which card a slot shows, which is kept with a Pokédex
 * binder's cards in the lists; no count and no value.
 */
export const FORGETS: Record<Exclude<ForgetWrite, "all">, readonly CacheScope[]> = {
    cards: ["lists", "stats", "holdings", "binders", "sets", "setPages", "value"],
    favorite: ["lists", "stats", "value"],
    binders: ["binders", "lists", "value"],
    profile: ["profile"],
    dexFace: ["lists"],
};

/**
 * The catalogue as a reader with no account sees it: one entry for everybody, so one tag for all
 * of it.
 *
 * No person in it on purpose. A signed-in reader's shelf carries their counts and is filed per
 * person under `scopeTag`; this answer carries nobody's, so a second entry per visitor would be a
 * cache with one entry each and a hit rate of nothing.
 *
 * Nothing in this app forgets it: the catalogue changes when the nightly copy on the API side
 * runs, and the five-minute window is what carries that across. The tag is here so a forget is one
 * import away on the day something does.
 */
export const CATALOGUE_TAG = "public:catalogue";

export const userTag = (userId: string) => `user:${userId}`;
export const scopeTag = (userId: string, scope: CacheScope) => `user:${userId}:${scope}`;
/*
 * The piece's tag, with the piece folded to lower case. A set page is filed under the id its address
 * was read with (`BASE1`), while a write from the API names the set as the API resolves it, case
 * blind (`base1`, api#579 webSetOf). Two spellings of one set would be two tags, and the write would
 * forget a piece no read carries while the page stood stale. Folding here is the one place both
 * sides pass through, so neither has to remember.
 */
export const partTag = (userId: string, scope: PartedScope, part: string) => `user:${userId}:${scope}:${part.toLowerCase()}`;

/** The one tag that stands for a ref: its scope's, or its piece's. */
const refTag = (userId: string, ref: ScopeRef) => (typeof ref === "string" ? scopeTag(userId, ref) : partTag(userId, ref.scope, ref.part));

/**
 * The tags one read is filed under: the person's, its scope's, and its piece's where it has one.
 * A read in a piece carries its scope's tag too, so a write that cannot name the piece still reaches it.
 */
export const readTags = (userId: string, ref: ScopeRef): string[] =>
    typeof ref === "string" ? [userTag(userId), scopeTag(userId, ref)] : [userTag(userId), scopeTag(userId, ref.scope), partTag(userId, ref.scope, ref.part)];

/** The scopes a write forgets: every one for `all`. */
export const scopesForgotten = (write: ForgetWrite): readonly CacheScope[] => (write === "all" ? CACHE_SCOPES : FORGETS[write]);

/**
 * What a write forgets, piece by piece. A write that names the set it touched narrows every parted
 * scope to that set; one that cannot name it (an import, a bulk edit, an old caller) drops the
 * whole scope. `all` is never narrowed: its reach is not known.
 */
export const targetsForgotten = (write: ForgetWrite, set?: string | null): readonly ScopeRef[] => {
    const scopes = scopesForgotten(write);
    if (!set || write === "all") return scopes;
    return scopes.map((scope) => (isParted(scope) ? { scope, part: set } : scope));
};

/** The tags a write drops: the person's own for `all`, which every read carries, else one per target. */
export const forgetTags = (userId: string, write: ForgetWrite, set?: string | null): string[] =>
    write === "all" ? [userTag(userId)] : targetsForgotten(write, set).map((ref) => refTag(userId, ref));

/**
 * Whether forgetting `target` reaches a read filed under the ref that `key` names (`refKey`). A
 * whole scope reaches its pieces; a piece reaches only itself.
 */
export const targetReaches = (target: ScopeRef, key: string): boolean => {
    const named = refKey(target);
    return key === named || (typeof target === "string" && key.startsWith(`${named}:`));
};
