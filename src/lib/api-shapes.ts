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

/**
 * A picture as a screen may draw it: a file in our own bucket, or null, which draws the placeholder.
 * Bart, 2026-09-15: every picture comes from our own storage; the API sends nothing else since
 * cardorb-api#484, and this keeps an older cache entry or a preview API from slipping one through.
 */
export const ownImage = (image: string | null | undefined): string | null => (image?.startsWith("https://images.cardorb.com/") ? image : null);

// ── GET /v1/cards ─────────────────────────────────────────────────────────────────────────

/**
 * One card's price, in euros: TCGplayer's market figure, the one number the app shows. The lowest
 * listing, Cardmarket's thirty-day average and the Near Mint band left the API (Bart, 2026-09-14);
 * an API still sending them is read the same, because zod drops what the schema does not name.
 */
export const apiPriceSchema = z.object({
    market: nullable(z.number()),
});
export type ApiPrice = z.infer<typeof apiPriceSchema>;

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

/** What one copy's price did over a window, and `total`, what that did to the list (times the copies). */
const priceChangeSchema = z.object({ was: z.number(), now: z.number(), change: z.number(), total: z.number(), from: z.string(), to: z.string() });
export type PriceChange = z.infer<typeof priceChangeSchema>;

export const cardItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    number: z.string(),
    set: z.string(),
    setTitle: z.string(),
    setAbbr: nullable(z.string()),
    /** The number as the card prints it ("XY124", "085"); absent from an API before its printedNumber. */
    printedNumber: nullable(z.string()).optional(),
    rarity: nullable(z.string()),
    gen: nullable(z.string()),
    type: nullable(z.string()),
    image: nullable(z.string()),
    imageHigh: nullable(z.string()),
    /** The picture of the printing this copy is, where it has its own (a Poké Ball reverse, Base Set's Unlimited); absent from an API before it said. */
    printImage: nullable(z.string()).optional(),
    speciesId: nullable(z.number()),
    /** What the card prints where `name` is the English for it; absent from an API before it said. */
    localName: nullable(z.string()).optional(),
    tcgId: nullable(z.string()),
    owned: z.boolean(),
    finish: vocabulary(FINISHES),
    /** What the foil looks like, where anything told us. Null is "not recorded". */
    foilPattern: vocabulary(FOIL_PATTERNS),
    /** Which print run, where somebody said. Absent from an API older than its #313. */
    edition: vocabulary(EDITIONS).optional(),
    quantity: z.number(),
    condition: nullable(z.string()),
    grade: nullable(z.string()),
    language: nullable(z.string()),
    purchasePrice: nullable(z.number()),
    purchaseDate: nullable(z.string()),
    notes: nullable(z.string()),
    isFavorite: z.boolean(),
    /** This card leads its Pokémon's Pokédex slot; absent from an API before it said so. */
    dexFace: z.boolean().nullish(),
    /** Kept off the public profile and the latest pull; absent from an API older than its #227. */
    excluded: z.boolean().nullish(),
    acquiredAt: nullable(z.string()),
    collectionId: nullable(z.string()),
    price: nullable(apiPriceSchema),
    /** What the stamped first run trades at, where TCGplayer prices that run apart. */
    priceFirstEd: nullable(apiPriceSchema).optional(),
    /**
     * Where this copy's figure came from: which printing of the card it was in TCGplayer's own
     * words, and their product id for it. One market since cardorb-api#354, so the source is
     * TCGplayer or nothing.
     */
    priceSource: z.enum(["tcgplayer"]).nullish(),
    pricePrinting: nullable(z.string()).optional(),
    tcgplayerId: nullable(z.number()).optional(),
    /** What that printing trades at: the figure this copy reads, where TCGplayer priced its printing. */
    printingPrice: nullable(apiPriceSchema).optional(),
    /** Only on a list sorted by price change (cardorb-api#470): the move over the window, null without two readings. */
    priceChange: nullable(priceChangeSchema).optional(),
});
export type CardItem = z.infer<typeof cardItemSchema>;

/**
 * The row a DELETE hands back, as it was the moment before it went.
 *
 * Not `cardItemSchema`: that is the assembled item a list reads, with the set's title, the
 * pictures and the prices the API works out. This is the stored row itself, the only thing an
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
    edition: vocabulary(EDITIONS).optional(),
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
     * What the card itself prints, where `name` is the English for it: a Japanese card is named
     * in English on every shelf (the app is English throughout) and the sheet
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
    /** The number as the card prints it ("XY124", "085"); a row's `number` can be stripped ("124"). Absent where nothing said. */
    printed_number?: string | null;
    rarity: string | null;
    gen: string | null;
    types: string[] | null;
    quantity: number | null;
    owned: boolean | null;
    is_favorite: boolean | null;
    /** The card its Pokémon's Pokédex slot shows: the one its owner left standing on the slider. */
    dex_face: boolean;
    /** Kept off the public profile and the latest pull. */
    excluded: boolean;
    condition: string | null;
    grade: string | null;
    language: string | null;
    finish: string | null;
    foil_pattern: string | null;
    /** Which print run, where somebody said. Null is "not recorded", never "unlimited". */
    edition: string | null;
    /**
     * What the stamped first run of this card trades at, TCGplayer's figure converted; null where
     * nobody prices that run. Here so a person looking at a copy can see what its run is worth
     * before deciding which one they are holding. The Shadowless run had one too, from Cardmarket,
     * and has none until TCGplayer's Shadowless products are read.
     */
    price_first_ed: number | null;
    /** Whether this copy has a TCGplayer price, which printing it was, and TCGplayer's id for it. */
    price_source: "tcgplayer" | null;
    price_printing: string | null;
    tcgplayer_id: number | null;
    purchase_price: number | null;
    purchase_date: string | null;
    acquired_at: string | null;
    notes: string | null;
    /** What one copy trades at today, in euros; null when TCGplayer has no number. */
    price: number | null;
    image_url: string | null;
    /** The larger scan (600 px), for a tile a phone draws at two pixels per point; null where the catalogue has one size. */
    image_high_url: string | null;
    /**
     * The picture of the printing this copy is, where that printing or its run has its own
     * (cardorb-api copy printImage). A list draws it; `image_url` stays the card's scan, which the
     * sheet draws every other printing over.
     */
    print_image_url?: string | null;
    tcg_id: string | null;
    collection_id: string | null;
    wishlist: boolean | null;
    /** The national Pokédex number the API read from the card; null for a trainer or energy. */
    species_id: number | null;
    /** On a list sorted by price change only: the move over its window, null without two readings. */
    price_change?: PriceChange | null;
};

/** One figure out of a price: the market figure. The Near Mint midpoint it used to prefer is gone. */
export const shownPrice = (p: ApiPrice | null | undefined): number | null => p?.market ?? null;

/**
 * The one number a copy is worth: the TCGplayer printing it is, where the API priced it, then the
 * stamped run's figure for a 1st Edition copy, then the card's own. The API's rule, copyPriceOf()
 * in its price-basis.mjs, which chooses the printing and sends that figure as `printingPrice`.
 * A copy of a card TCGplayer does not price has no price.
 *
 * A reverse (plain or patterned) has its own printing's figure or none: the card's own figure and
 * the stamped run's are the plain card's, and a missing price shows as unknown, never as another
 * printing's (Bart, 2026-09-14; the API's copyPriceOf() since the same day).
 */
export function priceForCopy({
    edition,
    finish,
    price,
    priceFirstEd,
    printingPrice,
}: Pick<CardItem, "price"> & Partial<Pick<CardItem, "edition" | "finish" | "priceFirstEd" | "printingPrice">>): number | null {
    if (isReverseFinish(finish)) return shownPrice(printingPrice);
    return shownPrice(printingPrice ?? (edition === "1st-edition" ? priceFirstEd : null) ?? price);
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
    printed_number: item.printedNumber ?? null,
    set: item.set || null,
    number: item.number || null,
    rarity: item.rarity,
    gen: item.gen,
    types: item.type ? [item.type] : null,
    quantity: item.quantity,
    owned: item.owned,
    is_favorite: item.isFavorite,
    dex_face: item.dexFace ?? false,
    excluded: item.excluded ?? false,
    condition: item.condition,
    grade: item.grade,
    language: item.language,
    finish: item.finish,
    foil_pattern: item.foilPattern,
    edition: item.edition ?? null,
    price_first_ed: shownPrice(item.priceFirstEd),
    price_source: item.priceSource ?? null,
    price_printing: item.pricePrinting ?? null,
    tcgplayer_id: item.tcgplayerId ?? null,
    purchase_price: item.purchasePrice,
    purchase_date: item.purchaseDate,
    acquired_at: item.acquiredAt,
    notes: item.notes,
    price: priceForCopy(item),
    image_url: ownImage(item.image),
    image_high_url: ownImage(item.imageHigh),
    print_image_url: ownImage(item.printImage),
    tcg_id: item.tcgId,
    collection_id: item.collectionId,
    species_id: item.speciesId,
    wishlist: !item.owned,
    ...(item.priceChange !== undefined ? { price_change: item.priceChange } : {}),
});

// ── GET /v1/public/{username}/cards ───────────────────────────────────────────────────────

export type PublicCard = Pick<
    Card,
    | "id"
    | "name"
    | "local_name"
    | "set_name"
    | "set_abbr"
    | "number"
    | "printed_number"
    | "rarity"
    | "gen"
    | "types"
    | "quantity"
    | "finish"
    | "foil_pattern"
    | "edition"
    | "condition"
    | "grade"
    | "image_url"
    | "image_high_url"
    | "tcg_id"
    | "is_favorite"
    | "dex_face"
    | "species_id"
>;

/** One card on a public profile with how many copies the owner holds. Nothing private (R-API-002 there). */
/**
 * Which printing a card's copies are and what state they are in, folded over them by the API: the
 * one answer every copy gives, null where they differ (cardorb-api#516 `agreedOn`). On a mover and
 * a public card, which are cards rather than copies; absent from an API before it said.
 */
const foldedCopyState = {
    finish: nullable(z.string()).optional(),
    foilPattern: nullable(z.string()).optional(),
    edition: nullable(z.string()).optional(),
    condition: nullable(z.string()).optional(),
    grade: nullable(z.string()).optional(),
};

export const publicItemSchema = z.object({
    key: z.string(),
    name: z.string(),
    number: z.string(),
    /** The number as printed and the set's code (cardorb-api#476); absent from an API before it. */
    printedNumber: nullable(z.string()).optional(),
    set: z.string(),
    setTitle: z.string(),
    setAbbr: nullable(z.string()).optional(),
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
    /** One of the owned copies leads its Pokédex slot; absent from an API before it said so. */
    dexFace: z.boolean().nullish(),
    ...foldedCopyState,
});
export type PublicItem = z.infer<typeof publicItemSchema>;

/** One tile per card; the copies held are its quantity. A wish never reaches this route. */
export const publicCardFromItem = (item: PublicItem): PublicCard => ({
    id: item.key,
    name: item.name,
    local_name: item.localName ?? null,
    set_name: item.setTitle || item.set || null,
    set_abbr: item.setAbbr ?? null,
    number: item.number || null,
    printed_number: item.printedNumber ?? null,
    rarity: item.rarity,
    gen: item.gen,
    types: item.type ? [item.type] : null,
    quantity: item.copies,
    // The printing and state every copy shares, for the line under the name; null where they differ.
    finish: item.finish ?? null,
    foil_pattern: item.foilPattern ?? null,
    edition: item.edition ?? null,
    condition: item.condition ?? null,
    grade: item.grade ?? null,
    image_url: ownImage(item.image),
    image_high_url: ownImage(item.imageHigh ?? null),
    tcg_id: item.tcgId,
    is_favorite: item.favorite ?? false,
    dex_face: item.dexFace ?? false,
    species_id: item.speciesId,
});

// ── GET /v1/pokedex ───────────────────────────────────────────────────────────────────────

/** One card in a Pokédex slot. `set` and `number` name it to the API, so a tap can open that card and not its namesakes. */
export type DexCard = {
    id: string;
    name: string;
    set: string | null;
    number: string | null;
    imageUrl: string | null;
    imageHighUrl: string | null;
    /** What one copy is worth in euros; null on a public profile, which carries no prices. */
    price: number | null;
    /** The card the slot opens on, because its owner left it standing there. */
    isFace: boolean;
};
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
    /**
     * The set's gallery (Trainer Gallery, Galarian Gallery), shown inside the set on the English
     * shelf since cardorb-api 2026-09-13: its name and how many of `total` are its cards.
     */
    gallery: z.object({ name: z.string(), total: z.number() }).nullish(),
    logo: nullable(z.string()),
    symbol: nullable(z.string()),
    /** The set's own name where `name` is a translation (a Japanese set); null for English. */
    localName: nullable(z.string()),
    /**
     * Whether the catalogue has recorded the set's cards, or only the set and its count. TCGdex
     * lists 68 of 184 Japanese sets without a card (2026-09-11). Absent
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
    /** The logo's own colours, largest first (`logo-color.ts`), filled in by `getSets`; empty until then, or where none can be read. */
    colors: string[];
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
            logoUrl: ownImage(set.logo),
            symbolUrl: ownImage(set.symbol),
            colors: [],
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
    /** In English on every shelf; `localName` is what a Japanese card prints, or null. */
    name: string;
    localName: string | null;
    /** As the catalogue names the set; what a new collection row is filed under. */
    setName: string;
    /** The code printed in the card's corner ("POR"), the set's and so the same on every card of it; null where the catalogue has none. */
    setAbbr: string | null;
    rarity: string | null;
    /** "Pokemon", "Trainer" or "Energy", and for a trainer its kind; null where the shelf did not say. */
    category: string | null;
    trainerType: string | null;
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
    /** Full art as the API decides it; absent where the answer did not say (`@/lib/full-art`). */
    fullArt?: boolean;
};

export const setCardFromBrowse = (c: BrowseCard, setAbbr: string | null = null): SetCard => ({
    id: c.id,
    number: c.number,
    name: c.name,
    localName: c.localName ?? null,
    setName: c.setName,
    setAbbr,
    rarity: c.rarity,
    category: c.category ?? null,
    trainerType: c.trainerType ?? null,
    types: c.types,
    imageUrl: ownImage(c.image),
    imageHighUrl: ownImage(c.imageHigh),
    owned: c.owned,
    wishlist: c.wishlist,
    quantity: c.quantity,
    itemIds: c.itemIds,
    // The same rule the collection uses, so one card does not carry two prices across two screens.
    price: priceForCopy({ price: c.price }),
    tcgId: c.tcgId,
    ...(c.fullArt === undefined ? {} : { fullArt: c.fullArt }),
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
    price: c.price,
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
    /* What kind of card it is, and for a trainer which kind of trainer. Absent from an API
       before it read them; they are what tells a full art Supporter from a gold Item, which
       share a rarity and nothing else (`@/lib/full-art`). */
    category: nullable(z.string()).optional(),
    trainerType: nullable(z.string()).optional(),
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
    /* What the card costs, on the routes that price it, the set page. Absent from search, where
       the answer is a name to pick rather than a shelf to read. */
    price: nullable(apiPriceSchema),
    /* Whether the illustration covers the whole card, as the API's catalogue copy decides it
       (cardorb-api#450). Only on the set page, and absent for a set the API read live; the set
       page falls back to `@/lib/full-art`'s own rule for a card without it. */
    fullArt: z.boolean().optional(),
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
     * off the Japanese shelf they are the only way to find it at all: those
     * sets have no English name to look up (cardorb-api#257).
     */
    tcgId?: string | null;
    language?: string | null;
    /** Already in the collection or on the wishlist, so the button can say so. */
    owned: boolean;
    wishlist: boolean;
    /** Copies already held: "you have three of this" is a different answer from "you have it". */
    quantity: number;
    /** One number, the way a tile shows it: null where the guide does not price the card, or the route did not ask. */
    price: number | null;
    /**
     * The heading a search puts it under (`@/lib/card-group`): its Pokémon, or its own name, and
     * how many hits of the whole search share it. Only on hits the browser's catalogue answered.
     */
    group?: { key: string; title: string; size: number };
};

/**
 * `language` is the catalogue the search asked (null or "en": the English one). A hit off the
 * Japanese catalogue carries that along, the only way the API can find it
 * (cardorb-api#257); an English hit carries no language, as every add before did.
 *
 * The catalogue id goes with every hit, as it does with every set tile: it is what the card's
 * price line is asked by, and the sheet a hit opens draws that line. The API adds an English
 * card by set name whether or not the id comes along, as it has for every set-page add.
 */
export const pokemonCardFromBrowse = (c: BrowseCard, language?: string | null): PokemonCard => ({
    tcgId: c.tcgId,
    ...(language && language !== "en" ? { language } : {}),
    id: c.id,
    name: c.name,
    set: c.setName,
    number: c.number,
    rarity: c.rarity,
    image: ownImage(c.image),
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
    price: priceForCopy({ price: c.price }),
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
    image_url: c.image,
    image_high_url: null,
    tcg_id: c.tcgId ?? null,
    collection_id: null,
    wishlist: c.wishlist,
    species_id: null,
});

// ── GET /v1/profile ───────────────────────────────────────────────────────────────────────

export const ownProfileSchema = z.object({
    username: z.string(),
    displayName: nullable(z.string()),
    isPublic: z.boolean(),
    /** The wishlist on the public profile too. Absent from an API before #176. */
    wishlistPublic: z.boolean().nullish(),
    /** The favorites on the public profile too. Absent from an API before #187. */
    favoritesPublic: z.boolean().nullish(),
    avatarUrl: nullable(z.string()),
    onboardedAt: nullable(z.string()),
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
    /** The favorites show on the public profile as well, while it is public. */
    favorites_public: boolean;
};

export const profileFromOwn = (p: OwnProfile): Profile => ({
    display_name: p.displayName,
    username: p.username,
    avatar_url: p.avatarUrl,
    is_public: p.isPublic,
    wishlist_public: p.wishlistPublic ?? false,
    favorites_public: p.favoritesPublic ?? false,
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
    /** A copy's condition, finish and language, over the list's copies (cardorb-api#373); absent before it. */
    conditions: z.array(z.string()).optional(),
    finishes: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
});

/**
 * How many cards each filter choice would leave, given the other filters (`?counts=1`): a set's
 * number counts the list with every filter on but the set's own. Keyed by the value the filter
 * takes (a set by its title). Absent from an API before cardorb-api#372.
 */
export const filterCountsSchema = z.object({
    set: z.record(z.string(), z.number()).optional(),
    rarity: z.record(z.string(), z.number()).optional(),
    gen: z.record(z.string(), z.number()).optional(),
    type: z.record(z.string(), z.number()).optional(),
    condition: z.record(z.string(), z.number()).optional(),
    finish: z.record(z.string(), z.number()).optional(),
    language: z.record(z.string(), z.number()).optional(),
    fullArt: z.number().optional(),
    duplicates: z.number().optional(),
});
export type FilterCounts = z.infer<typeof filterCountsSchema>;

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
    counts: filterCountsSchema.optional(),
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
/**
 * Every Pokémon's name by national number, and nothing else. The route that also says how many
 * of each you own is a different one and needs a session; this is a catalogue, so a stranger
 * looking at a public profile can read it too.
 */
/** `artwork_url` is the species' official picture, served by the API (cardorb-api#305); optional until every API answers it. */
export const speciesAnswer = z.object({ entries: z.array(z.object({ id: z.number(), name: z.string(), artwork_url: z.string().optional() })) });
export const catalogueSetsAnswer = z.object({ sets: z.array(catalogueSetSchema) });
/** `total` is how many the whole search matched, across every page; capped at the 250 the API reads. Optional until every API has it. */
export const searchAnswer = z.object({ cards: z.array(browseCardSchema), total: z.number().int().optional() });

export const setPageAnswer = z.object({
    /** The catalogue's own set, without the viewer's counts: those are the page's own two fields. */
    /** `abbreviation` is the printed code ("POR"), cardorb-api#374; optional until every API sends it. */
    set: catalogueSetSchema.omit({ ownedCount: true, wishlistCount: true }).extend({ abbreviation: z.string().nullish() }),
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
            /** Copies added since the point before, and their worth that day (cardorb-api#379). Absent on a folder's line. */
            added: z.number().optional(),
            addedValue: z.number().optional(),
        }),
    ),
});

/** One card's move over a period (GET /v1/movers, cardorb-api#464): per copy, and times the copies held. */
const moverSchema = z.object({
    tcgId: z.string(),
    name: z.string(),
    number: z.string(),
    set: z.string(),
    /** The code printed on the card; absent from an API before cardorb-api#471. */
    setAbbr: nullable(z.string()).optional(),
    /** The number as the card prints it; absent from an API before its printedNumber. */
    printedNumber: nullable(z.string()).optional(),
    /** The rarity of the printing held; absent from an API before it sent one. */
    rarity: nullable(z.string()).optional(),
    image: nullable(z.string()),
    ...foldedCopyState,
    copies: z.number(),
    was: z.number(),
    now: z.number(),
    change: z.number(),
    pct: z.number(),
    total: z.number(),
    from: z.string(),
    to: z.string(),
});
export type Mover = z.infer<typeof moverSchema>;

export const moversAnswer = z.object({ up: z.array(moverSchema), down: z.array(moverSchema) });

export const pricePointsAnswer = z.object({
    // `printings`: every printing's figure that day (normal, holofoil, reverse-holofoil, 1st-edition-holofoil,
    // shadowless-holofoil, ...), so the chart can draw the one a copy is. It was stripped here until 2026-09-14.
    points: z.array(
        z.object({ date: z.string(), market: nullable(z.number()), holo: nullable(z.number()), printings: z.record(z.string(), z.number()).optional() }),
    ),
});

export const publicCardsAnswer = z.object({
    cards: z.array(publicItemSchema),
    total: z.number(),
    copies: z.number().optional(),
    facets: facetsSchema.optional(),
});

export const publicTotalAnswer = z.object({ total: z.number(), copies: z.number().optional() });

export const publicFoldersAnswer = z.object({
    folders: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            kind: z.enum(["manual", "rule"]),
            count: z.number(),
            /** Set where the binder is shown as a Pokédex, so the page draws slots; absent from an API before it said so. */
            pokedex: pokedexSettingSchema.nullish(),
        }),
    ),
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
});

/**
 * One card's facts, as the sheet shows them.
 *
 * Every field is soft: this route answers from the catalogue, which knows a different amount
 * about every card, and the sheet already draws around what is missing. `printings` is the one
 * that matters most: a form offers no finish that is not in it.
 */
/**
 * The foil patterns a copy of a card can have, from TCGplayer's own products: one line per finish
 * and pattern, with its price, and whether a print without a pattern exists. A pattern this app
 * has no word for is dropped here rather than failing the whole card.
 */
const patternPrintsSchema = z.object({
    standard: z.boolean(),
    prints: z
        .array(
            z.object({
                foilPattern: z.string(),
                finish: z.string(),
                tcgplayerId: z.number(),
                price: nullable(apiPriceSchema),
                /** The print's own picture, a file of ours; null or absent where there is none (cardorb-api#501). */
                image: z.string().nullish(),
            }),
        )
        .transform((prints) =>
            prints.flatMap((p) =>
                p.foilPattern in FOIL_PATTERN_LABELS && (FINISHES as readonly string[]).includes(p.finish)
                    ? [{ ...p, foilPattern: p.foilPattern as FoilPattern, finish: p.finish as Finish }]
                    : [],
            ),
        ),
});
export type PatternPrints = z.infer<typeof patternPrintsSchema>;

export const cardFactsAnswer = z.object({
    rarity: nullable(z.string()),
    illustrator: nullable(z.string()),
    hp: nullable(z.number()),
    stage: nullable(z.string()),
    evolveFrom: nullable(z.string()),
    regulationMark: nullable(z.string()),
    /** The Western languages the card was printed in. Null or absent: the catalogue could not say. */
    languages: z.array(z.string()).nullish(),
    /**
     * Every printing of this card that exists, as the API reads it off the catalogue. The ball
     * reverses are finishes here, the way this app stores them, so a card that never had one
     * does not offer it.
     */
    printings: z
        .array(
            z.object({
                finish: z.enum(FINISHES),
                foilPattern: nullable(z.string()),
                /** The printing's own picture where TCGplayer sells it apart (cardorb-api#501); null or absent where the card's scan stands for it. */
                image: z.string().nullish(),
            }),
        )
        .nullish(),
    /** The print runs a copy can be from. Null or absent: no answer, and all of them are offered. */
    editions: z.array(z.enum(EDITIONS)).nullish(),
    /** A run's own picture, by run, where the store holds one: Base Set's Unlimited print (cardorb-api edition pictures). */
    editionPictures: z.record(z.string(), z.string()).nullish(),
    /**
     * The foil patterns a copy of this card can be recorded with. An empty list is an answer, none
     * (a Wizards holo had its set's one foil, cardorb-api#375); null or absent is no answer.
     */
    foilPatterns: z.array(z.string()).nullish(),
    /** The pattern prints TCGplayer sells of this card (cardorb-api#452). Null or absent: no answer. */
    patternPrints: patternPrintsSchema.nullish(),
    /** Whether a stamped first run of this card exists, as TCGdex says. Null or absent: no answer. */
    firstEdition: z.boolean().nullish(),
    /** TCGplayer's figure for the printing, converted; null where TCGplayer prices nothing (cardorb-api#354). */
    price: nullable(apiPriceSchema),
});

/** The most cards one `POST /v1/cards/facts` may name. */
export const CARD_FACTS_BATCH = 250;

/**
 * `POST /v1/cards/facts`: each id asked, with its facts or null. Each answer is parsed on its own
 * (cardFactsAnswer), so one card the API describes in a way this app cannot read costs that card,
 * not the page.
 */
export const cardFactsBatchAnswer = z.object({ cards: z.record(z.string(), z.unknown()) });
