/**
 * The plain half of `api-shapes.ts`: the words the API uses for a copy, their labels, and the mappers
 * that turn one shape a screen holds into another. No zod here, and nothing that parses: a client
 * component that only needs a label or a mapper imports this and leaves the schemas on the server.
 * `api-shapes.ts` re-exports all of it, so a server importer does not change.
 */
import type { Card, PokemonCard, SetCard } from "@/lib/api-shapes";

/**
 * A picture as a screen may draw it: a file in our own bucket, or null, which draws the placeholder.
 * Bart, 2026-09-15: every picture comes from our own storage; the API sends nothing else since
 * cardorb-api#484, and this keeps an older cache entry or a preview API from slipping one through.
 */
export const ownImage = (image: string | null | undefined): string | null => (image?.startsWith("https://images.cardorb.com/") ? image : null);

/** The patterned reverses TCGplayer sells as products of their own, each a finish with its own price (cardorb-api#455). */
export const PATTERNED_REVERSES = ["poke-ball", "master-ball", "energy-symbol", "friend-ball", "love-ball", "quick-ball", "dusk-ball", "team-rocket"] as const;
export const FINISHES = ["normal", "reverse-holo", "holo", ...PATTERNED_REVERSES] as const;
export type Finish = (typeof FINISHES)[number];
/**
 * The reverse holo and the patterned reverses TCGplayer sells apart (Poké Ball and Master Ball in Prismatic
 * Evolutions, Black Bolt and White Flare; Poké, Friend, Love, Quick and Dusk Ball, Team Rocket and Energy Symbol in
 * Ascended Heroes): shown as a reverse, and each priced from its own product (cardorb-api#454, #455).
 */
export const isReverseFinish = (f: string | null | undefined): boolean => f === "reverse-holo" || isPatternedReverse(f);
/** A Poké Ball, Friend Ball, Team Rocket, Energy Symbol or other patterned reverse. */
export const isPatternedReverse = (f: string | null | undefined): boolean => (PATTERNED_REVERSES as readonly (string | null | undefined)[]).includes(f);
/**
 * What the foil on a copy looks like, which is not what it is worth.
 *
 * A separate field from `finish` because finish is a price key: it picks between the two series
 * Cardmarket publishes, and holds the ball patterns only because those two are priced apart. A
 * cosmos holo and a plain holo of one card are one product and one figure.
 */
export const FOIL_PATTERNS = ["cosmos", "cracked-ice", "starlight", "confetti", "vertical-line"] as const;
export type FoilPattern = (typeof FOIL_PATTERNS)[number];

/**
 * Which print run a copy is from.
 *
 * A third field beside finish and pattern, and neither of them: the finish is a price key and
 * the pattern is what the foil looks like, while an edition is when the card was printed. The
 * classics were printed more than once and a 1st Edition is worth multiples of an unlimited
 * one. Null is not unlimited; it is nobody having said.
 */
export const EDITIONS = ["1st-edition", "shadowless", "unlimited", "blue-border"] as const;
export type Edition = (typeof EDITIONS)[number];

/** What a copy's print run is called in copy. */
export const EDITION_LABELS: Record<Edition, string> = {
    "1st-edition": "1st Edition",
    shadowless: "Shadowless",
    unlimited: "Unlimited",
    "blue-border": "Blue Border",
};

export const FOIL_PATTERN_LABELS: Record<FoilPattern, string> = {
    cosmos: "Cosmos",
    "cracked-ice": "Cracked ice",
    starlight: "Starlight",
    confetti: "Confetti",
    "vertical-line": "Vertical line",
};

/** What a copy's finish is called in copy. */
export const FINISH_LABELS: Record<Finish, string> = {
    normal: "Normal",
    "reverse-holo": "Reverse holo",
    holo: "Holo",
    "poke-ball": "Poké Ball reverse",
    "master-ball": "Master Ball reverse",
    "energy-symbol": "Energy Symbol reverse",
    "friend-ball": "Friend Ball reverse",
    "love-ball": "Love Ball reverse",
    "quick-ball": "Quick Ball reverse",
    "dusk-ball": "Dusk Ball reverse",
    "team-rocket": "Team Rocket reverse",
};

/** The shape the add action takes, from a set tile. */
/**
 * A catalogue card as the add path wants it.
 *
 * `language` is the shelf it was read from, not a property of the card, so it is passed in
 * rather than read off it: the same printing is on the English shelf and on none of the others.
 * With `tcgId` it is the whole of what lets the API find a Japanese card, whose set has no
 * English name to look up (cardorb-api#257).
 */
export const pokemonCardFromSetCard = (c: SetCard, language?: string): PokemonCard => ({
    tcgId: c.tcgId,
    language: language && language !== "en" ? language : null,
    id: c.id,
    name: c.name,
    set: c.setName,
    number: c.number,
    printedNumber: c.printedNumber,
    rarity: c.rarity,
    image: c.imageUrl,
    supertype: null,
    subtypes: null,
    hp: null,
    types: c.types.length ? c.types : null,
    artist: null,
    series: null,
    releaseDate: null,
    setPrintedTotal: null,
    flavorText: null,
    nationalPokedexNumbers: null,
    owned: c.owned,
    wishlist: c.wishlist,
    quantity: c.quantity ?? 0,
    price: c.price,
    listingPrice: c.listingPrice ?? null,
});

/**
 * A search hit as the sheet reads a card: every field about a copy is empty, because there is
 * none. What the set page does for a tile nobody holds, so a hit opens the same sheet a tile
 * does, with its price line, which the catalogue id asks for, and the number above the tabs.
 */
export const cardFromPokemonCard = (c: PokemonCard): Card => ({
    id: c.id,
    name: c.name,
    set_name: c.set,
    set_abbr: null,
    set: c.set,
    number: c.number,
    printed_number: c.printedNumber,
    rarity: c.rarity,
    gen: null,
    types: c.types,
    quantity: c.quantity,
    owned: c.owned,
    is_favorite: false,
    dex_face: false,
    excluded: false,
    condition: null,
    grade: null,
    language: null,
    finish: null,
    foil_pattern: null,
    edition: null,
    price_first_ed: null,
    price_source: null,
    price_printing: null,
    tcgplayer_id: null,
    purchase_price: null,
    purchase_date: null,
    acquired_at: null,
    notes: null,
    price: c.price,
    listing_price: c.listingPrice ?? null,
    image_url: c.image,
    image_high_url: null,
    tcg_id: c.tcgId ?? null,
    collection_id: null,
    wishlist: c.wishlist,
    species_id: null,
});

/** The most cards one `POST /v1/cards/facts` may name. */
export const CARD_FACTS_BATCH = 250;
