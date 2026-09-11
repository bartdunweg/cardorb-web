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
 * One entry per official name. The API keys its sets by the name the owner filed a card under,
 * and a set filed under two names ("SV Black Star Promos" and "SVP Black Star Promos", say) came
 * twice, under one title. The title is the set's name as far as the app is concerned (Bart,
 * 2026-09-11); the first `name` is kept for the address a rule or a filter may still carry.
 */
const byTitle = (sets: Facets["sets"]): Facets["sets"] => {
    const seen = new Set<string>();
    return sets.filter((s) => (seen.has(s.title) ? false : (seen.add(s.title), true)));
};

/**
 * The API's facets as the menus need them.
 *
 * The API has carried facets since its #161; an older deploy, a rollback, or an answer cached
 * before that one has none, and one older than its #226 has no gens and no types. Empty menus
 * then, not a page that throws on `facets.sets`.
 */
export const facetsFrom = (raw: Partial<Facets> | undefined): Facets => ({
    sets: byTitle(raw?.sets ?? []),
    rarities: raw?.rarities ?? [],
    gens: raw?.gens ?? [],
    types: raw?.types ?? [],
});
