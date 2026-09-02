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
export type ApiPrice = {
    low: number | null;
    market: number | null;
    avg30: number | null;
    nm: { low: number; mid: number; high: number } | null;
};

export type Finish = "normal" | "reverse-holo" | "holo";

export type CardItem = {
    id: string;
    name: string;
    number: string;
    set: string;
    setTitle: string;
    rarity: string | null;
    gen: string | null;
    type: string | null;
    image: string | null;
    imageHigh: string | null;
    speciesId: number | null;
    tcgId: string | null;
    owned: boolean;
    finish: Finish | null;
    quantity: number;
    condition: string | null;
    grade: string | null;
    purchasePrice: number | null;
    purchaseDate: string | null;
    notes: string | null;
    isFavorite: boolean;
    acquiredAt: string | null;
    collectionId: string | null;
    price: ApiPrice | null;
    priceHolo: ApiPrice | null;
};

export type Card = {
    id: string;
    name: string;
    set_name: string | null;
    number: string | null;
    rarity: string | null;
    gen: string | null;
    types: string[] | null;
    quantity: number | null;
    owned: boolean | null;
    is_favorite: boolean | null;
    condition: string | null;
    grade: string | null;
    finish: string | null;
    purchase_price: number | null;
    purchase_date: string | null;
    acquired_at: string | null;
    notes: string | null;
    /** What one copy trades at today, in euros; null when Cardmarket has no number. */
    price: number | null;
    image_url: string | null;
    tcg_id: string | null;
    collection_id: string | null;
    wishlist: boolean | null;
};

/**
 * The one number a copy is worth. A holo or reverse-holo copy takes the holo price when there is
 * one; the Near Mint midpoint is preferred, the market price is the fallback.
 */
export function priceForCopy({ finish, price, priceHolo }: Pick<CardItem, "finish" | "price" | "priceHolo">): number | null {
    const chosen = (finish === "holo" || finish === "reverse-holo" ? priceHolo : null) ?? price;
    return chosen?.nm?.mid ?? chosen?.market ?? null;
}

export const cardFromItem = (item: CardItem): Card => ({
    id: item.id,
    name: item.name,
    set_name: item.setTitle || item.set || null,
    number: item.number || null,
    rarity: item.rarity,
    gen: item.gen,
    types: item.type ? [item.type] : null,
    quantity: item.quantity,
    owned: item.owned,
    is_favorite: item.isFavorite,
    condition: item.condition,
    grade: item.grade,
    finish: item.finish,
    purchase_price: item.purchasePrice,
    purchase_date: item.purchaseDate,
    acquired_at: item.acquiredAt,
    notes: item.notes,
    price: priceForCopy(item),
    image_url: absoluteImage(item.image),
    tcg_id: item.tcgId,
    collection_id: item.collectionId,
    wishlist: !item.owned,
});

// ── GET /v1/public/{username}/collection ───────────────────────────────────────────────────

export type PublicCard = Pick<Card, "id" | "name" | "set_name" | "number" | "rarity" | "gen" | "types" | "quantity" | "finish" | "image_url" | "tcg_id">;

type PublicVariant = { rarity: string | null; owned: boolean };
type PublicOwnedCard = {
    key: string;
    name: string;
    number: string;
    type: string | null;
    gen: string | null;
    image: string | null;
    tcgId: string | null;
    variants: PublicVariant[];
};
export type PublicSet = { name: string; title: string; cards: PublicOwnedCard[] };

/** One entry per owned copy, in set order. A wish is not shown on a public page. */
export function publicCardsFromSets(sets: PublicSet[]): PublicCard[] {
    const out: PublicCard[] = [];
    for (const set of sets) {
        for (const card of set.cards) {
            card.variants.forEach((v, i) => {
                if (!v.owned) return;
                out.push({
                    id: `${card.key}:${i}`,
                    name: card.name,
                    set_name: set.title || set.name || null,
                    number: card.number || null,
                    rarity: v.rarity,
                    gen: card.gen,
                    types: card.type ? [card.type] : null,
                    quantity: null,
                    finish: null,
                    image_url: absoluteImage(card.image),
                    tcg_id: card.tcgId,
                });
            });
        }
    }
    return out;
}

// ── GET /v1/pokedex ───────────────────────────────────────────────────────────────────────

export type DexEntry = { id: number; name: string; owned: number; cards: { key: string; name: string; image: string | null }[] };
export type DexCard = { id: string; name: string; imageUrl: string | null };
export type DexSlot = { number: number; cards: DexCard[] };

export function slotsFromEntries(entries: DexEntry[]): { slots: DexSlot[]; caughtNumbers: number; totalCards: number } {
    let caughtNumbers = 0;
    let totalCards = 0;
    const slots = entries.map((e) => {
        if (e.owned > 0) caughtNumbers += 1;
        totalCards += e.owned;
        return {
            number: e.id,
            cards: e.cards.map((c) => ({ id: c.key, name: c.name, imageUrl: absoluteImage(c.image) })),
        };
    });
    return { slots, caughtNumbers, totalCards };
}

// ── GET /v1/catalog/search ────────────────────────────────────────────────────────────────

export type BrowseCard = {
    id: string;
    number: string;
    name: string;
    setName: string;
    image: string | null;
    imageHigh: string | null;
    rarity: string | null;
    types: string[];
    series: string;
    owned: boolean;
    wishlist: boolean;
    quantity: number;
    itemIds: string[];
};

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
    /** Already in the collection or on the wishlist, so the button can say so. */
    owned: boolean;
    wishlist: boolean;
};

export const pokemonCardFromBrowse = (c: BrowseCard): PokemonCard => ({
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
});

// ── GET /v1/profile ───────────────────────────────────────────────────────────────────────

export type OwnProfile = {
    username: string;
    displayName: string | null;
    isPublic: boolean;
    avatarUrl: string | null;
    onboardedAt: string | null;
    email: string;
};

export type Profile = {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
    is_public: boolean;
};

export const profileFromOwn = (p: OwnProfile): Profile => ({
    display_name: p.displayName,
    username: p.username,
    avatar_url: p.avatarUrl,
    is_public: p.isPublic,
});
