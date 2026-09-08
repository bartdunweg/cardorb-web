/** What a filter menu offers: the sets you hold a card of, in set order, and the rarities, A to Z. */
export type Facets = {
    sets: { name: string; title: string }[];
    rarities: string[];
    /** In the collection's own order, which is the catalogue's series order and so chronological. */
    gens: string[];
    /** A to Z. */
    types: string[];
};

/**
 * Nothing to offer: the menus a dialog or a sheet draws before the facets have landed, and what a
 * read that failed falls back to. Never written into, so one object serves every caller.
 */
export const NO_FACETS: Facets = { sets: [], rarities: [], gens: [], types: [] };

/**
 * The API's facets as the menus need them.
 *
 * The API has carried facets since its #161; an older deploy, a rollback, or an answer cached
 * before that one has none, and one older than its #226 has no gens and no types. Empty menus
 * then, not a page that throws on `facets.sets`.
 */
export const facetsFrom = (raw: Partial<Facets> | undefined): Facets => ({
    sets: raw?.sets ?? [],
    rarities: raw?.rarities ?? [],
    gens: raw?.gens ?? [],
    types: raw?.types ?? [],
});
