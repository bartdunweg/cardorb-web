import { z } from "zod";
import { type FolderKind, type FolderRule, type PokedexSetting, folderRuleSchema, pokedexSettingSchema } from "@/lib/folder-rule";

/**
 * The API's answers are parsed here, not cast (CLAUDE.md: zod at every boundary).
 *
 * `api<T>()` used to hand back `json as T`, so a field the API renamed, dropped or started
 * sending as a string reached a component untouched and surfaced as a blank tile, a NaN or a
 * crash three layers from the cause. These schemas turn that into one error at the edge, naming
 * the field.
 *
 * Two deliberate softnesses, because a schema that is stricter than the API is an outage waiting
 * for the next deploy:
 *
 * - **A missing key reads as null.** Every optional field on the wire is a field some older API
 *   did not send; `nullable()` below accepts both and normalises to null.
 * - **An unknown word is null, not a failure.** `finish` and `foilPattern` are vocabularies the
 *   API may extend before this app knows the new member. A card whose finish this app cannot
 *   name is still a card, so `vocabulary()` falls back rather than rejecting the whole answer.
 *
 * Structure is not soft: a missing `id`, or a `quantity` that arrives as a string, fails.
 */

/** `null` and "the key was not sent" are one answer to a screen. */
const nullable = <T extends z.ZodType>(inner: T) => inner.nullish().transform((v) => v ?? null);

/** A closed list the API may extend: an unrecognised word reads as "not recorded". */
const vocabulary = <const T extends readonly [string, ...string[]]>(values: T) =>
    z
        .enum(values)
        .nullish()
        .catch(null)
        .transform((v) => v ?? null);

/**
 * What the API answers, and how it becomes what the screens already render.
 *
 * The screens were written against the `cards` table's own column names. Rather than touch every
 * component, the API's shapes are translated here, in plain functions a test can call. Nothing in
 * this file talks to the network.
 */

export const API_ORIGIN = new URL(process.env.CARDORB_API_URL ?? "https://api.cardorb.com/v1").origin;

/** A card picture can be relative (`/api/cover?url=…`): it resolves on the API's host, not ours. */
export const absoluteImage = (image: string | null | undefined): string | null => (image ? (image.startsWith("/") ? `${API_ORIGIN}${image}` : image) : null);

// ── GET /v1/cards ─────────────────────────────────────────────────────────────────────────

/** One card's Cardmarket price, in euros. `nm.mid` is the number the grid shows. */
export const apiPriceSchema = z.object({
    low: nullable(z.number()),
    market: nullable(z.number()),
    avg30: nullable(z.number()),
    nm: nullable(z.object({ low: z.number(), mid: z.number(), high: z.number() })),
});
export type ApiPrice = z.infer<typeof apiPriceSchema>;

export const FINISHES = ["normal", "reverse-holo", "holo", "poke-ball", "master-ball"] as const;
export type Finish = (typeof FINISHES)[number];
/** The finishes that are a reverse holo with a pattern (151, Prismatic Evolutions): priced and shown as a reverse. */
export const isReverseFinish = (f: string | null | undefined): boolean => f === "reverse-holo" || f === "poke-ball" || f === "master-ball";
/**
 * What the foil on a copy looks like, which is not what it is worth.
 *
 * A separate field from `finish` because finish is a price key: it picks between the two series
 * Cardmarket publishes, and holds the ball patterns only because those two are priced apart. A
 * cosmos holo and a plain holo of one card are one product and one figure.
 */
export const FOIL_PATTERNS = ["cosmos", "cracked-ice", "starlight", "confetti", "vertical-line"] as const;
export type FoilPattern = (typeof FOIL_PATTERNS)[number];

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
};

export const cardItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    number: z.string(),
    set: z.string(),
    setTitle: z.string(),
    setAbbr: nullable(z.string()),
    rarity: nullable(z.string()),
    gen: nullable(z.string()),
    type: nullable(z.string()),
    image: nullable(z.string()),
    imageHigh: nullable(z.string()),
    speciesId: nullable(z.number()),
    /** What the card prints where `name` is the English for it; absent from an API before it said. */
    localName: nullable(z.string()).optional(),
    tcgId: nullable(z.string()),
    owned: z.boolean(),
    finish: vocabulary(FINISHES),
    /** What the foil looks like, where anything told us. Null is "not recorded". */
    foilPattern: vocabulary(FOIL_PATTERNS),
    quantity: z.number(),
    condition: nullable(z.string()),
    grade: nullable(z.string()),
    language: nullable(z.string()),
    purchasePrice: nullable(z.number()),
    purchaseDate: nullable(z.string()),
    notes: nullable(z.string()),
    isFavorite: z.boolean(),
    /** Kept off the public profile and the latest pull; absent from an API older than its #227. */
    excluded: z.boolean().nullish(),
    acquiredAt: nullable(z.string()),
    collectionId: nullable(z.string()),
    price: nullable(apiPriceSchema),
    priceHolo: nullable(apiPriceSchema),
});
export type CardItem = z.infer<typeof cardItemSchema>;

/**
 * The row a DELETE hands back, as it was the moment before it went.
 *
 * Not `cardItemSchema`: that is the assembled item a list reads, with the set's title, the
 * pictures and the prices the API works out. This is the stored row itself — the only thing an
 * undo needs, because putting it back is an ordinary create of exactly these fields.
 *
 * Everything is optional and forgiving on purpose. An API that has not deployed this yet answers
 * `{ ok: true }` with no card, and a removal must still be a removal; it just cannot be undone.
 */
export const removedCardSchema = z.object({
    name: z.string(),
    number: z.string(),
    setName: z.string(),
    rarity: nullable(z.string()).optional(),
    gen: nullable(z.string()).optional(),
    types: z.array(z.string()).optional(),
    owned: z.boolean(),
    excluded: z.boolean().nullish(),
    acquiredAt: nullable(z.string()).optional(),
    finish: vocabulary(FINISHES).optional(),
    foilPattern: vocabulary(FOIL_PATTERNS).optional(),
    quantity: z.number().optional(),
    condition: nullable(z.string()).optional(),
    grade: nullable(z.string()).optional(),
    language: nullable(z.string()).optional(),
    purchasePrice: nullable(z.number()).optional(),
    purchaseDate: nullable(z.string()).optional(),
    notes: nullable(z.string()).optional(),
    isFavorite: z.boolean().optional(),
    collectionId: nullable(z.string()).optional(),
});
export type RemovedCard = z.infer<typeof removedCardSchema>;
export const removedAnswer = z.object({ card: removedCardSchema.nullish() });

export type Card = {
    id: string;
    name: string;
    /**
     * What the card itself prints, where `name` is the English for it: a Japanese, Korean or
     * Chinese card is named in English on every shelf (the app is English throughout) and the sheet
     * shows the printed name in brackets after it. Absent or null on an English card, and on a row
     * read from the collection, which stores one name.
     */
    local_name?: string | null;
    set_name: string | null;
    /** The code printed on the card: MEW, SFA, DEX. Null where the catalogue codes no set. */
    set_abbr: string | null;
    /** The set as the API addresses it, for asking after this card's other rows. */
    set: string | null;
    number: string | null;
    rarity: string | null;
    gen: string | null;
    types: string[] | null;
    quantity: number | null;
    owned: boolean | null;
    is_favorite: boolean | null;
    /** Kept off the public profile and the latest pull. */
    excluded: boolean;
    condition: string | null;
    grade: string | null;
    language: string | null;
    finish: string | null;
    foil_pattern: string | null;
    purchase_price: number | null;
    purchase_date: string | null;
    acquired_at: string | null;
    notes: string | null;
    /** What one copy trades at today, in euros; null when Cardmarket has no number. */
    price: number | null;
    image_url: string | null;
    /** The larger scan (600 px), for a tile a phone draws at two pixels per point; null where the catalogue has one size. */
    image_high_url: string | null;
    tcg_id: string | null;
    collection_id: string | null;
    wishlist: boolean | null;
    /** The national Pokédex number the API read from the card; null for a trainer or energy. */
    species_id: number | null;
};

/**
 * The one number a copy is worth. A holo or reverse-holo copy takes the holo price when there is
 * one; the Near Mint midpoint is preferred, the market price is the fallback.
 */
export function priceForCopy({ finish, price, priceHolo }: Pick<CardItem, "finish" | "price" | "priceHolo">): number | null {
    // The API's rule (cards.ts variantPrice): only a reverse holo, patterned or not, takes the foil price.
    const chosen = (isReverseFinish(finish) ? priceHolo : null) ?? price;
    return chosen?.nm?.mid ?? chosen?.market ?? null;
}

/**
 * A folder as `GET /v1/folders` sends it. `kind` and `rule` are optional on the wire: an API from
 * before rule folders sends neither, and every folder is then one filled by hand.
 */
export const folderItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    count: z.number(),
    kind: z.enum(["manual", "rule"]).nullish(),
    rule: folderRuleSchema.nullish(),
    pokedex: pokedexSettingSchema.nullish(),
    /** Shown on the public profile, as a filter over the public cards. Absent from an API before #175. */
    isPublic: z.boolean().nullish(),
});
export type FolderItem = z.infer<typeof folderItemSchema>;

export type Folder = {
    id: string;
    name: string;
    createdAt: string;
    count: number;
    kind: FolderKind;
    rule: FolderRule | null;
    pokedex: PokedexSetting | null;
    isPublic: boolean;
};

export function folderFromApi(f: FolderItem): Folder {
    const rule = f.rule ?? null;
    return {
        id: f.id,
        name: f.name,
        createdAt: f.createdAt,
        count: f.count,
        kind: f.kind ?? (rule ? "rule" : "manual"),
        rule,
        pokedex: f.pokedex ?? null,
        isPublic: f.isPublic ?? false,
    };
}

export const cardFromItem = (item: CardItem): Card => ({
    id: item.id,
    name: item.name,
    local_name: item.localName ?? null,
    set_name: item.setTitle || item.set || null,
    set_abbr: item.setAbbr ?? null,
    set: item.set || null,
    number: item.number || null,
    rarity: item.rarity,
    gen: item.gen,
    types: item.type ? [item.type] : null,
    quantity: item.quantity,
    owned: item.owned,
    is_favorite: item.isFavorite,
    excluded: item.excluded ?? false,
    condition: item.condition,
    grade: item.grade,
    language: item.language,
    finish: item.finish,
    foil_pattern: item.foilPattern,
    purchase_price: item.purchasePrice,
    purchase_date: item.purchaseDate,
    acquired_at: item.acquiredAt,
    notes: item.notes,
    price: priceForCopy(item),
    image_url: absoluteImage(item.image),
    image_high_url: absoluteImage(item.imageHigh),
    tcg_id: item.tcgId,
    collection_id: item.collectionId,
    species_id: item.speciesId,
    wishlist: !item.owned,
});

// ── GET /v1/public/{username}/cards ───────────────────────────────────────────────────────

export type PublicCard = Pick<
    Card,
    | "id"
    | "name"
    | "local_name"
    | "set_name"
    | "number"
    | "rarity"
    | "gen"
    | "types"
    | "quantity"
    | "finish"
    | "image_url"
    | "image_high_url"
    | "tcg_id"
    | "is_favorite"
    | "species_id"
>;

/** One card on a public profile with how many copies the owner holds. Nothing private (R-API-002 there). */
export const publicItemSchema = z.object({
    key: z.string(),
    name: z.string(),
    number: z.string(),
    set: z.string(),
    setTitle: z.string(),
    rarity: nullable(z.string()),
    gen: nullable(z.string()),
    type: nullable(z.string()),
    image: nullable(z.string()),
    /** The larger scan; absent from an API before #179. */
    imageHigh: nullable(z.string()),
    speciesId: nullable(z.number()),
    /** What the card prints where `name` is the English for it; absent from an API before it said. */
    localName: nullable(z.string()).optional(),
    tcgId: nullable(z.string()),
    copies: z.number(),
    /** One of the owned copies is starred; absent from an API before it said so. */
    favorite: z.boolean().nullish(),
});
export type PublicItem = z.infer<typeof publicItemSchema>;

/** One tile per card; the copies held are its quantity. A wish never reaches this route. */
export const publicCardFromItem = (item: PublicItem): PublicCard => ({
    id: item.key,
    name: item.name,
    local_name: item.localName ?? null,
    set_name: item.setTitle || item.set || null,
    number: item.number || null,
    rarity: item.rarity,
    gen: item.gen,
    types: item.type ? [item.type] : null,
    quantity: item.copies,
    finish: null,
    image_url: absoluteImage(item.image),
    image_high_url: absoluteImage(item.imageHigh ?? null),
    tcg_id: item.tcgId,
    is_favorite: item.favorite ?? false,
    species_id: item.speciesId,
});

// ── GET /v1/pokedex ───────────────────────────────────────────────────────────────────────

export const dexEntrySchema = z.object({
    id: z.number(),
    name: z.string(),
    owned: z.number(),
    cards: z.array(z.object({ key: z.string(), name: z.string(), image: nullable(z.string()) })),
});
export type DexEntry = z.infer<typeof dexEntrySchema>;
/** One card in a Pokédex slot. `set` and `number` name it to the API, so a tap can open that card and not its namesakes. */
export type DexCard = { id: string; name: string; set: string | null; number: string | null; imageUrl: string | null; imageHighUrl: string | null };
export type DexSlot = { number: number; cards: DexCard[] };

// ── GET /v1/catalog/sets ──────────────────────────────────────────────────────────────────

/** One set as the API lists it, with the viewer's own counts folded in. Newest set first. */
export const catalogueSetSchema = z.object({
    id: z.string(),
    name: z.string(),
    series: z.string(),
    /** "YYYY/MM/DD", as pokemontcg.io writes it. */
    releaseDate: nullable(z.string()),
    /** Every card in the set, secret rares included. */
    total: z.number(),
    /** The number printed on the cards; a set of 207 may print "165". */
    printedTotal: nullable(z.number()),
    logo: nullable(z.string()),
    symbol: nullable(z.string()),
    /** The set's own name where `name` is a translation (a Japanese set); null for English. */
    localName: nullable(z.string()),
    /**
     * Whether the catalogue has recorded the set's cards, or only the set and its count. TCGdex
     * lists 68 of 184 Japanese sets and 92 of 95 Korean ones without a card (2026-09-11). Absent
     * from an API before cardorb-api#265, which reads as recorded: that was the only answer then.
     */
    cardsRecorded: z.boolean().nullish(),
    /** Distinct cards of the set held; never more than `total` (cardorb-api#162). */
    ownedCount: z.number(),
    wishlistCount: z.number(),
});
export type CatalogueSet = z.infer<typeof catalogueSetSchema>;

export type SetSummary = {
    id: string;
    name: string;
    /** The set's own name beside a translated one; null for English. */
    localName: string | null;
    series: string;
    releaseDate: string | null;
    logoUrl: string | null;
    symbolUrl: string | null;
    owned: number;
    total: number;
    complete: boolean;
    /** False where the catalogue has the set and its count but none of its cards yet. */
    cardsRecorded: boolean;
};

export type SetSeries = { name: string; sets: SetSummary[] };

/** The shelf, one row per series in the order the API lists sets, plus the counts the header shows. */
export function seriesFromSets(sets: CatalogueSet[]): { series: SetSeries[]; complete: number; started: number; totalSets: number } {
    const bySeries = new Map<string, SetSummary[]>();
    let complete = 0;
    let started = 0;
    for (const set of sets) {
        const owned = set.ownedCount;
        const summary: SetSummary = {
            id: set.id,
            name: set.name,
            localName: set.localName ?? null,
            series: set.series,
            releaseDate: set.releaseDate,
            logoUrl: absoluteImage(set.logo),
            symbolUrl: absoluteImage(set.symbol),
            cardsRecorded: set.cardsRecorded ?? true,
            owned,
            total: set.total,
            complete: set.total > 0 && owned >= set.total,
        };
        if (summary.complete) complete += 1;
        if (owned > 0) started += 1;
        bySeries.set(set.series, [...(bySeries.get(set.series) ?? []), summary]);
    }
    const series = [...bySeries.entries()].map(([name, list]) => ({ name, sets: list }));
    return { series, complete, started, totalSets: sets.length };
}

// ── GET /v1/catalog/sets/:setId ───────────────────────────────────────────────────────────

/** One tile on a set page: the card as the catalogue knows it, and whether it is in the binder. */
export type SetCard = {
    id: string;
    number: string;
    /** In English on every shelf; `localName` is what a Japanese, Korean or Chinese card prints, or null. */
    name: string;
    localName: string | null;
    /** As the catalogue names the set; what a new collection row is filed under. */
    setName: string;
    rarity: string | null;
    types: string[];
    imageUrl: string | null;
    /** The larger scan, so a set tile is as sharp as the same card on any other overview. */
    imageHighUrl: string | null;
    owned: boolean;
    wishlist: boolean;
    quantity: number;
    /** Every collection row this card matched: owned copies and wishes alike. */
    itemIds: string[];
    /** One number, the way a tile shows it: null where Cardmarket does not price the card. */
    price: number | null;
    /** The catalogue id everything priced is keyed by; null where the two catalogues never met. */
    tcgId: string | null;
};

export const setCardFromBrowse = (c: BrowseCard): SetCard => ({
    id: c.id,
    number: c.number,
    name: c.name,
    localName: c.localName ?? null,
    setName: c.setName,
    rarity: c.rarity,
    types: c.types,
    imageUrl: absoluteImage(c.image),
    imageHighUrl: absoluteImage(c.imageHigh),
    owned: c.owned,
    wishlist: c.wishlist,
    quantity: c.quantity,
    itemIds: c.itemIds,
    // The same rule the collection uses, so one card does not carry two prices across two screens.
    price: priceForCopy({ finish: null, price: c.price, priceHolo: c.priceHolo }),
    tcgId: c.tcgId,
});

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
});

// ── GET /v1/catalog/search ────────────────────────────────────────────────────────────────

export const browseCardSchema = z.object({
    id: z.string(),
    number: z.string(),
    name: z.string(),
    /* The printed name of a card whose `name` is a translation (a Japanese card); null on English
       cards, absent from an API before it named the other shelves in English. */
    localName: nullable(z.string()).optional(),
    setName: z.string(),
    image: nullable(z.string()),
    imageHigh: nullable(z.string()),
    rarity: nullable(z.string()),
    types: z.array(z.string()),
    series: z.string(),
    owned: z.boolean(),
    wishlist: z.boolean(),
    quantity: z.number(),
    itemIds: z.array(z.string()),
    /* The same card's TCGdex id, where the two catalogues could be matched. The English path
       numbers a card `me5-85` and everything priced is keyed `me05-085`; the set page carries it
       so a sheet opened on a card nobody holds can still ask for its price line. */
    tcgId: nullable(z.string()),
    /* What the card costs, on the routes that price it — the set page. Absent from search, where
       the answer is a name to pick rather than a shelf to read. */
    price: nullable(apiPriceSchema),
    priceHolo: nullable(apiPriceSchema),
});
export type BrowseCard = z.infer<typeof browseCardSchema>;

/** What the search previews render. The fields the catalogue does not carry are null, and the preview skips them. */
export type PokemonCard = {
    id: string;
    name: string;
    set: string;
    number: string;
    rarity: string | null;
    image: string | null;
    supertype: string | null;
    subtypes: string[] | null;
    hp: string | null;
    types: string[] | null;
    artist: string | null;
    series: string | null;
    releaseDate: string | null;
    setPrintedTotal: number | null;
    flavorText: string | null;
    nationalPokedexNumbers: number[] | null;
    /**
     * The catalogue's own id, and which catalogue it came from. Both null for an English card,
     * which the API still finds by set name the way every row before today was found. For a card
     * off the Japanese, Korean or Chinese shelves they are the only way to find it at all: those
     * sets have no English name to look up (cardorb-api#257).
     */
    tcgId?: string | null;
    language?: string | null;
    /** Already in the collection or on the wishlist, so the button can say so. */
    owned: boolean;
    wishlist: boolean;
    /** Copies already held: "you have three of this" is a different answer from "you have it". */
    quantity: number;
};

/**
 * `language` is the catalogue the search asked (null or "en": the English one). A hit off the
 * Japanese, Korean or Chinese catalogue carries that and its id along, the only way the API can
 * find it (cardorb-api#257); an English hit carries neither, as every add before did.
 */
export const pokemonCardFromBrowse = (c: BrowseCard, language?: string | null): PokemonCard => ({
    ...(language && language !== "en" ? { tcgId: c.tcgId, language } : {}),
    id: c.id,
    name: c.name,
    set: c.setName,
    number: c.number,
    rarity: c.rarity,
    image: absoluteImage(c.image),
    supertype: null,
    subtypes: null,
    hp: null,
    types: c.types.length ? c.types : null,
    artist: null,
    series: c.series || null,
    releaseDate: null,
    setPrintedTotal: null,
    flavorText: null,
    nationalPokedexNumbers: null,
    owned: c.owned,
    wishlist: c.wishlist,
    quantity: c.quantity ?? 0,
});

// ── GET /v1/profile ───────────────────────────────────────────────────────────────────────

export const ownProfileSchema = z.object({
    username: z.string(),
    displayName: nullable(z.string()),
    isPublic: z.boolean(),
    /** The wishlist on the public profile too. Absent from an API before #176. */
    wishlistPublic: z.boolean().nullish(),
    /** The favorites and the Pokédex on the public profile too. Absent from an API before #187. */
    favoritesPublic: z.boolean().nullish(),
    pokedexPublic: z.boolean().nullish(),
    avatarUrl: nullable(z.string()),
    onboardedAt: nullable(z.string()),
    pokedex: pokedexSettingSchema.nullish(),
    email: z.string(),
});
export type OwnProfile = z.infer<typeof ownProfileSchema>;

export type Profile = {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
    is_public: boolean;
    /** The wishlist shows on the public profile as well, while it is public. */
    wishlist_public: boolean;
    /** The favorites and the Pokédex show on the public profile as well, while it is public. */
    favorites_public: boolean;
    pokedex_public: boolean;
    /** How the built-in Pokédex shows; null is every slot, missing ones too. */
    pokedex: PokedexSetting | null;
};

export const profileFromOwn = (p: OwnProfile): Profile => ({
    display_name: p.displayName,
    username: p.username,
    avatar_url: p.avatarUrl,
    is_public: p.isPublic,
    wishlist_public: p.wishlistPublic ?? false,
    favorites_public: p.favoritesPublic ?? false,
    pokedex_public: p.pokedexPublic ?? false,
    pokedex: p.pokedex ?? null,
});

// ── What each route answers ───────────────────────────────────────────────────────────────

/**
 * One schema per route this app calls, so `api()` has something to parse against.
 *
 * They are envelopes: the API wraps its lists (`{ cards, total, facets }`), and the envelope is
 * as much a part of the contract as the rows inside it. A route that lost its `total` would
 * otherwise reach a component as `undefined` and count as zero.
 */

/** The sets and rarities a filter menu offers. */
export const facetsSchema = z.object({
    sets: z.array(z.object({ name: z.string(), title: z.string() })),
    rarities: z.array(z.string()),
    gens: z.array(z.string()),
    types: z.array(z.string()),
});

export const cardsAnswer = z.object({
    /** The list as a person counts it: an owned copy `quantity` times, a wish once. Absent from an API before 2026-09-11. */
    copies: z.number().optional(),
    cards: z.array(cardItemSchema),
    total: z.number(),
    facets: facetsSchema.optional(),
    value: z.number().optional(),
    unpriced: z.number().optional(),
    /** The catalogue is not answering, so pictures and prices are missing rather than absent. */
    catalogueUnavailable: z.boolean().optional(),
});

export const facetsAnswer = z.object({ facets: facetsSchema.optional() });

export const statsAnswer = z.object({
    stats: z.object({
        cards: z.number(),
        copies: z.number(),
        wishlist: z.number(),
        favorites: z.number(),
        sets: z.number(),
        value: z.number(),
        unpriced: z.number(),
    }),
});

export const foldersAnswer = z.object({ folders: z.array(folderItemSchema) });
export const pokedexAnswer = z.object({ entries: z.array(dexEntrySchema) });
/**
 * Every Pokémon's name by national number, and nothing else. The route that also says how many
 * of each you own is a different one and needs a session; this is a catalogue, so a stranger
 * looking at a public profile can read it too.
 */
export const speciesAnswer = z.object({ entries: z.array(z.object({ id: z.number(), name: z.string() })) });
export const catalogueSetsAnswer = z.object({ sets: z.array(catalogueSetSchema) });
/** `total` is how many the whole search matched, across every page; capped at the 250 the API reads. Optional until every API has it. */
export const searchAnswer = z.object({ cards: z.array(browseCardSchema), total: z.number().int().optional() });

export const setPageAnswer = z.object({
    /** The catalogue's own set, without the viewer's counts: those are the page's own two fields. */
    set: catalogueSetSchema.omit({ ownedCount: true, wishlistCount: true }),
    cards: z.array(browseCardSchema),
    totalCount: z.number(),
    ownedCount: z.number(),
    hasMore: z.boolean(),
});

export const valueHistoryAnswer = z.object({
    snapshots: z.array(
        z.object({
            date: z.string(),
            value: z.number(),
            cards: z.number(),
            priced: z.number(),
            unpriced: z.number(),
        }),
    ),
});

export const pricePointsAnswer = z.object({
    points: z.array(z.object({ date: z.string(), market: nullable(z.number()), holo: nullable(z.number()) })),
});

export const publicCardsAnswer = z.object({
    cards: z.array(publicItemSchema),
    total: z.number(),
    copies: z.number().optional(),
    facets: facetsSchema.optional(),
});

export const publicTotalAnswer = z.object({ total: z.number(), copies: z.number().optional() });

export const publicFoldersAnswer = z.object({
    folders: z.array(z.object({ id: z.string(), name: z.string(), kind: z.enum(["manual", "rule"]), count: z.number() })),
});

export const avatarAnswer = z.object({ avatarUrl: z.string() });
export const usernameAnswer = z.object({ available: z.boolean(), reason: z.string().optional() });
export const createdFolderAnswer = z.object({ folder: z.object({ id: z.string() }) });
export const copyAnswer = z.object({ card: z.object({ id: nullable(z.string()) }).optional() });

/** A public profile: no email, no onboarding, nothing private (R-API-002 on the API's side). */
export const publicProfileAnswer = z.object({
    username: z.string(),
    displayName: nullable(z.string()),
    avatarUrl: nullable(z.string()),
    wishlistPublic: z.boolean().nullish(),
    favoritesPublic: z.boolean().nullish(),
    pokedexPublic: z.boolean().nullish(),
    pokedex: pokedexSettingSchema.nullish(),
});

/**
 * One card's facts, as the sheet shows them.
 *
 * Every field is soft: this route answers from the catalogue, which knows a different amount
 * about every card, and the sheet already draws around what is missing. `printings` is the one
 * that matters most — a form offers no finish that is not in it.
 */
export const cardFactsAnswer = z.object({
    illustrator: nullable(z.string()),
    hp: nullable(z.number()),
    stage: nullable(z.string()),
    evolveFrom: nullable(z.string()),
    regulationMark: nullable(z.string()),
    cmUrl: nullable(z.string()),
    languages: z.array(z.string()).nullish(),
    printings: z.array(z.object({ finish: z.enum(["normal", "holo", "reverse-holo"]), foilPattern: nullable(z.string()) })).nullish(),
    price: nullable(apiPriceSchema),
    market: nullable(z.object({ avg: nullable(z.number()), trend: nullable(z.number()), avg7: nullable(z.number()) })),
});
