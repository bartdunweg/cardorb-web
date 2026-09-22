import { z } from "zod";
import type { BinderKind, BinderRule, PokedexSetting } from "@/lib/binder-rule";
import { binderRuleSchema, pokedexSettingSchema } from "@/lib/binder-rule-schema";
import { EDITIONS, FINISHES, FOIL_PATTERNS, FOIL_PATTERN_LABELS, isReverseFinish, ownImage } from "@/lib/card-shapes";
import type { Finish, FoilPattern } from "@/lib/card-shapes";

// The labels, the vocabularies and the mappers without zod live in card-shapes.ts; every importer of this file still finds them here.
export {
    CARD_FACTS_BATCH,
    EDITIONS,
    EDITION_LABELS,
    FINISHES,
    FINISH_LABELS,
    FOIL_PATTERNS,
    FOIL_PATTERN_LABELS,
    PATTERNED_REVERSES,
    cardFromPokemonCard,
    isPatternedReverse,
    isReverseFinish,
    ownImage,
    pokemonCardFromSetCard,
} from "@/lib/card-shapes";
export type { Edition, Finish, FoilPattern } from "@/lib/card-shapes";

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

// ── GET /v1/cards ─────────────────────────────────────────────────────────────────────────

/**
 * One card's price, in euros: TCGplayer's market figure, the number the app sums and ranks by.
 * Where TCGplayer has no market figure for the printing (listed, never sold), the API sends its
 * lowest listing instead, `market` null and `basis` "lowest-listing" (cardorb-api#561, Bart
 * 2026-09-18): shown as "From €…" everywhere, never summed. Absent from an API before it.
 */
export const apiPriceSchema = z.object({
    market: nullable(z.number()),
    lowestListing: nullable(z.number()).optional(),
    basis: z.enum(["market", "lowest-listing"]).nullish(),
});
export type ApiPrice = z.infer<typeof apiPriceSchema>;

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
    /** Every Pokémon on the card, two or three for a tag team; absent from an API before it said. */
    speciesIds: z.array(z.number()).optional(),
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
    /** The catalogue id the row was filed under; a Japanese-shelf row goes back by it, not by set name alone. */
    tcgId: nullable(z.string()).optional(),
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
    /** The stamped run's lowest listing where it has no market figure (cardorb-api#561); shown as "From €…". */
    listing_first_ed?: number | null;
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
    /**
     * TCGplayer's lowest listing, in euros, where it has no market figure for this copy's printing
     * (`price` is null then). Shown as "From €…", never summed. Absent where nothing said.
     */
    listing_price?: number | null;
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
    /** Every Pokémon on the card, `species_id` first: a tag team fills two or three Pokédex slots. */
    species_ids?: number[];
    /** On a list sorted by price change only: the move over its window, null without two readings. */
    price_change?: PriceChange | null;
};

/** One figure out of a price: the market figure. The Near Mint midpoint it used to prefer is gone. */
export const shownPrice = (p: ApiPrice | null | undefined): number | null => p?.market ?? null;

/** A price's lowest listing, where it is one: no market figure, and a listing in its place. */
export const listingOf = (p: ApiPrice | null | undefined): number | null => (p && p.market == null ? (p.lowestListing ?? null) : null);

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
    for (const p of copyChain({ edition, finish, price, priceFirstEd, printingPrice })) if (shownPrice(p) != null) return shownPrice(p);
    return null;
}

/**
 * The lowest listing a copy is shown at, where nothing it reads has a market figure: the API's
 * copyPriceOf() reads a market figure anywhere on the chain before any listing, and so does this.
 * Null wherever priceForCopy() has a figure. Shown as "From €…", never summed.
 */
export function listingForCopy(
    item: Pick<CardItem, "price"> & Partial<Pick<CardItem, "edition" | "finish" | "priceFirstEd" | "printingPrice">>,
): number | null {
    if (priceForCopy(item) != null) return null;
    for (const p of copyChain(item)) if (listingOf(p) != null) return listingOf(p);
    return null;
}

/** The prices a copy reads, in order: a reverse its own printing's alone. */
const copyChain = ({
    edition,
    finish,
    price,
    priceFirstEd,
    printingPrice,
}: Pick<CardItem, "price"> & Partial<Pick<CardItem, "edition" | "finish" | "priceFirstEd" | "printingPrice">>) =>
    isReverseFinish(finish) ? [printingPrice] : [printingPrice, edition === "1st-edition" ? priceFirstEd : null, price];

/**
 * A binder as `GET /v1/folders` sends it. `kind` and `rule` are optional on the wire: an API from
 * before rule binders sends neither, and every binder is then one filled by hand.
 */
export const binderItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    count: z.number(),
    kind: z.enum(["manual", "rule"]).nullish(),
    rule: binderRuleSchema.nullish(),
    pokedex: pokedexSettingSchema.nullish(),
    /** Shown on the public profile, as a filter over the public cards. Absent from an API before #175. */
    isPublic: z.boolean().nullish(),
});
export type BinderItem = z.infer<typeof binderItemSchema>;

export type Binder = {
    id: string;
    name: string;
    createdAt: string;
    count: number;
    kind: BinderKind;
    rule: BinderRule | null;
    pokedex: PokedexSetting | null;
    isPublic: boolean;
};

export function binderFromApi(f: BinderItem): Binder {
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
    listing_first_ed: listingOf(item.priceFirstEd),
    price_source: item.priceSource ?? null,
    price_printing: item.pricePrinting ?? null,
    tcgplayer_id: item.tcgplayerId ?? null,
    purchase_price: item.purchasePrice,
    purchase_date: item.purchaseDate,
    acquired_at: item.acquiredAt,
    notes: item.notes,
    price: priceForCopy(item),
    listing_price: listingForCopy(item),
    image_url: ownImage(item.image),
    image_high_url: ownImage(item.imageHigh),
    print_image_url: ownImage(item.printImage),
    tcg_id: item.tcgId,
    collection_id: item.collectionId,
    species_id: item.speciesId,
    ...(item.speciesIds ? { species_ids: item.speciesIds } : {}),
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
    | "species_ids"
> &
    /** Only where the owner shows prices: a tile and the sheet draw it when it is there. */
    Partial<Pick<Card, "price" | "listing_price">>;

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
    /** Every Pokémon on the card, two or three for a tag team; absent from an API before it said. */
    speciesIds: z.array(z.number()).optional(),
    /** What the card prints where `name` is the English for it; absent from an API before it said. */
    localName: nullable(z.string()).optional(),
    tcgId: nullable(z.string()),
    copies: z.number(),
    /** One of the owned copies is starred; absent from an API before it said so. */
    favorite: z.boolean().nullish(),
    /** One of the owned copies leads its Pokédex slot; absent from an API before it said so. */
    dexFace: z.boolean().nullish(),
    ...foldedCopyState,
    /**
     * What the copies trade at, only for an owner who shows prices (their pricesPublic): null where
     * the copies differ or nothing prices the card, absent where prices are not shown at all.
     */
    price: nullable(z.number()).optional(),
    /**
     * TCGplayer's lowest listing where no copy has a market figure (cardorb-api#561), under the
     * same rule as `price`: only for an owner who shows prices. Shown as "From €…", never summed.
     */
    listingPrice: z.number().optional(),
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
    ...(item.speciesIds ? { species_ids: item.speciesIds } : {}),
    // Left off, not nulled, where the owner shows no prices: the grid draws a price when the field exists.
    ...(item.price !== undefined ? { price: item.price } : {}),
    // The listing rides on the same rule: never where the owner keeps prices private.
    ...(item.price !== undefined && item.listingPrice != null ? { listing_price: item.listingPrice } : {}),
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
    /** What one copy is worth in euros; null on a public profile whose owner shows no prices. */
    price: number | null;
    /** TCGplayer's lowest listing where it has no market figure (cardorb-api#561); shown as "From €…", never summed. */
    listingPrice?: number | null;
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
    /**
     * Distinct cards of the set held; never more than `total` (cardorb-api#162). Both are left out
     * of the answer where the reader carried no credential (cardorb-api, 2026-09-22): absent means
     * nobody was asked, which is not the same as a 0 that says the set is untouched.
     */
    ownedCount: z.number().optional(),
    wishlistCount: z.number().optional(),
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
    /** The logo's own colours, largest first (`logo-color.ts`), filled in by `getSets` (`getShelf` leaves them empty); empty until then, or where none can be read. */
    colors: string[];
    /** Distinct cards of the set held; null where nobody was asked, which no count can stand in for. */
    owned: number | null;
    total: number;
    /** Whether the whole set is held; null where nobody was asked, for the same reason `owned` is. */
    complete: boolean | null;
    /** False where the catalogue has the set and its count but none of its cards yet. */
    cardsRecorded: boolean;
};

export type SetSeries = { name: string; sets: SetSummary[] };

/**
 * The shelf, one row per series in the order the API lists sets, plus the counts the header shows.
 *
 * `complete` and `started` are counts of one person's own progress across the shelf, so a reader
 * nobody asked has neither, and neither is 0. They travel as one nullable object rather than two
 * nullable numbers: they answer one question ("how far along is this person"), and a single null
 * cannot be checked for one of them and forgotten for the other. `totalSets` is a catalogue fact
 * and stays a number for everyone.
 */
export function seriesFromSets(sets: CatalogueSet[]): { series: SetSeries[]; progress: { complete: number; started: number } | null; totalSets: number } {
    const bySeries = new Map<string, SetSummary[]>();
    let complete = 0;
    let started = 0;
    // The API leaves the holding fields out of the whole answer or sends them for every set, so one
    // set carrying a count is enough to say a person was asked.
    const asked = sets.some((set) => set.ownedCount !== undefined);
    for (const set of sets) {
        const owned = set.ownedCount ?? null;
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
            complete: owned === null ? null : set.total > 0 && owned >= set.total,
        };
        if (summary.complete) complete += 1;
        if (owned !== null && owned > 0) started += 1;
        bySeries.set(set.series, [...(bySeries.get(set.series) ?? []), summary]);
    }
    const series = [...bySeries.entries()].map(([name, list]) => ({ name, sets: list }));
    return { series, progress: asked ? { complete, started } : null, totalSets: sets.length };
}

// ── GET /v1/catalog/sets/:setId ───────────────────────────────────────────────────────────

/** One tile on a set page: the card as the catalogue knows it, and whether it is in the binder. */
export type SetCard = {
    id: string;
    number: string;
    /** The number as the card prints it, what its label reads ("4/102" on a Classic Collection card whose `number` is 001). Absent: `number`. */
    printedNumber?: string | null;
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
    /** One number, the way a tile shows it: null where TCGplayer has no market figure for the card. */
    price: number | null;
    /** TCGplayer's lowest listing where it has no market figure; shown as "From €…". */
    listingPrice?: number | null;
    /** The catalogue id everything priced is keyed by; null where the two catalogues never met. */
    tcgId: string | null;
    /** Full art as the API decides it; absent where the answer did not say (`@/lib/full-art`). */
    fullArt?: boolean;
    /** Which printing `price` is, as the sheet keys its printings; null where the API did not say. */
    printing?: string | null;
    /** The print run `price` is, for a card sold in runs; null for one sold in one run. */
    edition?: string | null;
    /** What that price did over the last seven days; null without two readings or an API that does not say. */
    priceChange?: { was: number; now: number; change: number } | null;
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
    listingPrice: listingForCopy({ price: c.price }),
    tcgId: c.tcgId,
    printedNumber: c.printedNumber ?? c.number,
    ...(c.fullArt === undefined ? {} : { fullArt: c.fullArt }),
    printing: c.printing ?? null,
    edition: c.edition ?? null,
    priceChange: c.priceChange ? { was: c.priceChange.was, now: c.priceChange.now, change: c.priceChange.change } : null,
});

// ── GET /v1/catalog/search ────────────────────────────────────────────────────────────────

export const browseCardSchema = z.object({
    id: z.string(),
    /* The catalogue's number, what ownership and a new row match by. */
    number: z.string(),
    /* The number as the card prints it, for its label: `number` except on a Classic Collection card,
       which prints its original card's number ("4/102" where `number` is 001). Absent from an API
       before cardorb-api#532. */
    printedNumber: z.string().optional(),
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
    /* Which printing `price` is, keyed as the card sheet keys its printing buttons ("normal",
       "reverse-holo", "holo/cosmos"): the first of the sheet's order that has a price, so the tile
       and the sheet it opens show one printing. Only on the set page; absent from an API before it
       named it, and null where no printing has a price. */
    printing: nullable(z.string()).optional(),
    /* The print run that price is, for a card sold in runs ("unlimited", "1st-edition"): the choice its
       sheet offers, so the tile names it rather than the finish. Only on the set page; null for a
       card sold in one run, absent from an API before cardorb-api#566. */
    edition: nullable(z.string()).optional(),
    /* What that printing's price did since the `from` the set page asked with: its first and last
       reading in the window. Absent where not asked for, null with fewer than two readings. */
    priceChange: nullable(z.object({ was: z.number(), now: z.number(), change: z.number(), from: z.string(), to: z.string() })).optional(),
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
    /** The number as the card prints it, where the catalogue said; see `SetCard.printedNumber`. */
    printedNumber?: string | null;
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
    /** TCGplayer's lowest listing where it has no market figure; shown as "From €…". */
    listingPrice?: number | null;
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
    printedNumber: c.printedNumber ?? c.number,
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
    listingPrice: listingForCopy({ price: c.price }),
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
    /** Card prices and the collection's value on the public profile too. Absent from an API before it. */
    pricesPublic: z.boolean().nullish(),
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
    /** Card prices and the collection's value show on the public profile as well, while it is public. */
    prices_public: boolean;
};

export const profileFromOwn = (p: OwnProfile): Profile => ({
    display_name: p.displayName,
    username: p.username,
    avatar_url: p.avatarUrl,
    is_public: p.isPublic,
    wishlist_public: p.wishlistPublic ?? false,
    favorites_public: p.favoritesPublic ?? false,
    prices_public: p.pricesPublic ?? false,
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
    /** Of the unpriced copies, those shown at a lowest listing and left out of `value`. Absent from an API before #561. */
    listed: z.number().optional(),
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

export const bindersAnswer = z.object({ folders: z.array(binderItemSchema) });
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
    /** Distinct cards of the set held; left out where the reader carried no credential, as on the shelf. */
    ownedCount: z.number().optional(),
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
            /** Copies added since the point before, and their worth that day (cardorb-api#379). Absent on a binder's line. */
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
    /**
     * Today's lowest listing of each printing TCGplayer lists and has no market figure for, keyed as
     * `printings` is (cardorb-api#561 follow-up): such a printing has no line. Absent from an API before it.
     */
    listings: z.record(z.string(), z.number()).optional(),
});

/** The list's worth, only for an owner who shows prices: euros over the whole list, and the copies it leaves out. */
const publicWorth = {
    value: z.number().optional(),
    unpriced: z.number().optional(),
    /** Of the unpriced copies, those shown at a lowest listing and left out of `value` (cardorb-api#561). */
    listed: z.number().optional(),
};
export const publicCardsAnswer = z.object({
    cards: z.array(publicItemSchema),
    total: z.number(),
    copies: z.number().optional(),
    facets: facetsSchema.optional(),
    ...publicWorth,
});

export const publicTotalAnswer = z.object({ total: z.number(), copies: z.number().optional(), ...publicWorth });

export const publicBindersAnswer = z.object({
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
export const createdBinderAnswer = z.object({ folder: z.object({ id: z.string() }) });
export const copyAnswer = z.object({ card: z.object({ id: nullable(z.string()) }).optional() });

/** A public profile: no email, no onboarding, nothing private (R-API-002 on the API's side). */
export const publicProfileAnswer = z.object({
    username: z.string(),
    displayName: nullable(z.string()),
    avatarUrl: nullable(z.string()),
    wishlistPublic: z.boolean().nullish(),
    favoritesPublic: z.boolean().nullish(),
    /** The cards route prices what it lists; the page says a value under the name. Absent from an API before it. */
    pricesPublic: z.boolean().nullish(),
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

/**
 * `POST /v1/cards/facts`: each id asked, with its facts or null. Each answer is parsed on its own
 * (cardFactsAnswer), so one card the API describes in a way this app cannot read costs that card,
 * not the page.
 */
export const cardFactsBatchAnswer = z.object({ cards: z.record(z.string(), z.unknown()) });
