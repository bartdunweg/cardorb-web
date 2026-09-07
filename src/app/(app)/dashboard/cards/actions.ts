"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { type PokemonCard, cardFactsAnswer, copyAnswer, pokemonCardFromBrowse, pricePointsAnswer, searchAnswer } from "@/lib/api-shapes";
import { type Card, getMyCards } from "@/lib/cards";
import { type CopyEdits, copyEdits, sameCard } from "@/lib/copies";
import { WESTERN_LANGUAGES } from "@/lib/languages";
import { getSets } from "@/lib/sets";
import { forgetMine } from "@/lib/user-cache";

export type { PokemonCard } from "@/lib/api-shapes";

/** A hit in your own collection is the whole card, so a tap on it can open the card rather than a search for its name. */
export type CardHit = Card;

type Result = { ok: true } | { ok: false; error: string };

const failed = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof ApiError ? err.message : "Something went wrong. Try again.",
});

const term = z.string().trim().max(100);
const choice = z.string().trim().min(1).max(100).optional();

/** The chips under a collection search: a set (as the API addresses it) and a rarity, matched whole, as on a folder page. */
export type MyCardsFilters = { set?: string; rarity?: string };

// Searches the signed-in person's own collection (the phone's search sheet). A filter on its own
// lists that set or rarity; without one the term has to be at least a character.
export async function searchMyCards(query: string, filters: MyCardsFilters = {}): Promise<CardHit[]> {
    const parsed = z.object({ q: term, set: choice, rarity: choice }).safeParse({ q: query, ...filters });
    if (!parsed.success) return [];
    const { q, set, rarity } = parsed.data;
    if (!q && !set && !rarity) return [];

    const { cards } = await getMyCards({ q: q || undefined, set, rarity, facets: false, limit: 20 });
    return cards;
}

/** The chips under a catalogue search: a set by its name and an energy type. */
export type CatalogueFilters = { set?: string; type?: string };

// Searches the catalogue through the API, which also says whether each hit is already yours. With
// a filter on, the API's fielded mode is asked instead: the term matches the name only, the set
// and the type their own fields; the term may then be empty, or one character.
export async function searchPokemon(query: string, filters: CatalogueFilters = {}): Promise<PokemonCard[]> {
    const parsed = z.object({ q: term, set: choice, type: choice }).safeParse({ q: query, ...filters });
    if (!parsed.success) return [];
    const { q, set, type } = parsed.data;
    const params = set || type ? { ...(q ? { name: q } : {}), ...(set ? { set } : {}), ...(type ? { type } : {}) } : q.length >= 2 ? { query: q } : null;
    if (!params) return [];

    try {
        const { cards } = await api("/catalog/search", { params, schema: searchAnswer });
        return cards.map(pokemonCardFromBrowse);
    } catch {
        return [];
    }
}

const cardSchema = z.object({
    name: z.string().trim().min(1),
    set: z.string().trim().min(1, "That card has no set."),
    number: z.string().trim(),
    rarity: z.string().nullable(),
    types: z.array(z.string()).nullable(),
});

// Adds a catalogue card to the collection or the wishlist. The API matches it against the
// catalogues, picks the picture and the price; nothing about the card is stored from here.
export async function addCard(input: PokemonCard, target: "collection" | "wishlist" = "collection", collectionId?: string): Promise<Result> {
    const parsed = cardSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const c = parsed.data;
    const wishlist = target === "wishlist";
    try {
        await api("/cards", {
            method: "POST",
            body: {
                name: c.name,
                set: c.set,
                number: c.number,
                ...(c.rarity ? { rarity: c.rarity } : {}),
                types: c.types ?? [],
                collection: !wishlist,
                // Added from a folder's own page: filed in it at once.
                ...(collectionId && !wishlist && z.string().uuid().safeParse(collectionId).success ? { collectionId } : {}),
            },
        });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

// Sets how many of one copy are held. The API refuses 0: a card you no longer hold is removed.
export async function setCopies(cardId: string, quantity: number): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), quantity: z.number().int().min(1).max(999) }).safeParse({ cardId, quantity });
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { quantity: parsed.data.quantity } });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

// Removes one row: an owned copy or a wish. The API wants a JSON content type on a delete, so
// the body is an empty object.
export async function removeCard(cardId: string): Promise<Result> {
    const parsed = z.string().uuid().safeParse(cardId);
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    try {
        await api(`/collection/items/${parsed.data}`, { method: "DELETE", body: {} });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

// Moves a wishlist card into the owned collection (the person acquired it).
export async function markOwned(cardId: string): Promise<Result> {
    const parsed = z.string().uuid().safeParse(cardId);
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    try {
        await api(`/collection/items/${parsed.data}`, { method: "PATCH", body: { owned: true } });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

// A star on a card you own. The API keeps the flag; the favorites list and the card sheet read it.
export async function setFavorite(cardId: string, isFavorite: boolean): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), isFavorite: z.boolean() }).safeParse({ cardId, isFavorite });
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { isFavorite: parsed.data.isFavorite } });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

/**
 * Keep this copy off the public profile, or put it back.
 *
 * The API and the public routes have honoured the flag since it existed; this is the switch. It
 * is per copy, not per card: a graded one can stay private while the plain one is shown.
 */
export async function setExcluded(cardId: string, excluded: boolean): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), excluded: z.boolean() }).safeParse({ cardId, excluded });
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { excluded: parsed.data.excluded } });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
}

/** One reading of a card's price, from GET /v1/cards/{tcgId}/prices. Euros; null where Cardmarket published nothing. */
export type PricePoint = { date: string; market: number | null; holo: number | null };

// A card's price day by day over the last ninety days, for the sheet. Empty, not an error, for a
// card with no readings yet; and empty when the API cannot answer, since the sheet is open for
// the card, not for its line.
export async function cardPriceHistory(tcgId: string): Promise<PricePoint[]> {
    try {
        const { points } = await api(`/cards/${encodeURIComponent(tcgId)}/prices`, { schema: pricePointsAnswer });
        return points;
    } catch (err) {
        console.error("Price history unavailable:", err instanceof Error ? err.message : err);
        return [];
    }
}

// A generation's logo: the earliest set of that series that carries one and is not a promo
// set, from the shelf the Browse page already reads. Null where the series is unknown.
export async function seriesLogo(series: string): Promise<string | null> {
    try {
        const shelf = await getSets();
        const found = shelf.series.find((s) => s.name === series);
        if (!found) return null;
        const sets = [...found.sets]
            .filter((s) => s.logoUrl && !/promo/i.test(s.name))
            .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));
        return sets[0]?.logoUrl ?? null;
    } catch {
        return null;
    }
}

// The language of one copy. Null clears it back to "not recorded", which reads as English.
export async function setLanguage(cardId: string, language: string | null): Promise<Result> {
    const codes = WESTERN_LANGUAGES.map((l) => l.code);
    const parsed = z.object({ cardId: z.string().uuid(), language: z.enum(codes as [string, ...string[]]).nullable() }).safeParse({ cardId, language });
    if (!parsed.success) return { ok: false, error: "Invalid input." };
    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { language: parsed.data.language } });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}

// Every row of one card the person holds: the set and number name it, the name confirms it
// (two cards of one number in one set do not happen, but the check costs nothing).
export async function listCopies(card: Pick<Card, "set" | "number" | "name">): Promise<Card[]> {
    if (!card.set || !card.number) return [];
    try {
        const { cards } = await getMyCards({ set: card.set, number: card.number, facets: false, limit: 100 });
        return cards.filter((c) => c.owned && sameCard(c, card));
    } catch (err) {
        console.error("Copies unavailable:", err instanceof Error ? err.message : err);
        return [];
    }
}

const copyBody = z.object({ cardId: z.string().uuid(), count: z.number().int().min(1).max(999), edits: copyEdits });

// One more copy of a row, as a row of its own, with these differences (none is one more of the same).
export async function addCopy(cardId: string, edits: CopyEdits, count = 1): Promise<Result | { ok: true; id: string }> {
    const parsed = copyBody.safeParse({ cardId, count, edits });
    if (!parsed.success) return { ok: false, error: "Invalid input." };
    let id: string | undefined;
    try {
        const res = await api(`/collection/items/${parsed.data.cardId}/copies`, {
            method: "POST",
            body: { ...parsed.data.edits, count: parsed.data.count },
            schema: copyAnswer,
        });
        id = res.card?.id ?? undefined;
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return id ? { ok: true, id } : { ok: true };
}

// Some of a row's copies as a row of their own: the row loses `count`, the copy keeps the row's acquired date.
export async function splitCopy(cardId: string, edits: CopyEdits, count = 1): Promise<Result> {
    const parsed = copyBody.safeParse({ cardId, count, edits });
    if (!parsed.success || Object.keys(parsed.data.edits).length === 0) return { ok: false, error: "Invalid input." };
    try {
        await api(`/collection/items/${parsed.data.cardId}/split`, { method: "POST", body: { ...parsed.data.edits, count: parsed.data.count } });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}

// When a copy was pulled: an ISO date, not in the future; decides Newest first.
export async function setAcquiredAt(cardId: string, date: string): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse({ cardId, date });
    if (!parsed.success) return { ok: false, error: "Invalid input." };
    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { acquiredAt: parsed.data.date } });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}

/** What the catalogue knows about a printing beyond what the row carries (GET /v1/cards/{tcgId}). */
export type CardFacts = {
    illustrator: string | null;
    hp: number | null;
    stage: string | null;
    evolveFrom: string | null;
    regulationMark: string | null;
    /** Cardmarket's page for the card. */
    cmUrl: string | null;
    /** The Western languages the card was printed in; a copy can be one of these and no other. */
    languages: string[];
    /**
     * Every printing of this card that exists: what each one is, and what its foil looks like.
     * A form offers no finish and no pattern that is not here — and offers everything where the
     * list is empty, because empty is the catalogue having no answer rather than none existing.
     */
    printings: { finish: "normal" | "holo" | "reverse-holo"; foilPattern: string | null }[];
    /** The catalogue's own price for the printing: the market figure, its floor and its Near Mint band. */
    price: { low: number | null; market: number | null; avg30: number | null; nm: { low: number; mid: number; high: number } | null } | null;
    /** Cardmarket's averages: the all-time average, the trend, and the last seven days. */
    market: { avg: number | null; trend: number | null; avg7: number | null } | null;
};

// The card's facts for the sheet: the illustrator, HP, stage, regulation mark, the Cardmarket page
// and what the catalogue says the printing is worth. Null when the catalogue cannot answer; the
// sheet is open for the row, not for these.
export async function cardFacts(tcgId: string): Promise<CardFacts | null> {
    try {
        const c = await api(`/cards/${encodeURIComponent(tcgId)}`, { schema: cardFactsAnswer });
        return {
            illustrator: c.illustrator ?? null,
            hp: c.hp ?? null,
            stage: c.stage ?? null,
            evolveFrom: c.evolveFrom ?? null,
            regulationMark: c.regulationMark ?? null,
            cmUrl: c.cmUrl ?? null,
            languages: Array.isArray(c.languages) ? c.languages : ["en"],
            printings: Array.isArray(c.printings) ? c.printings : [],
            price: c.price ?? null,
            market: c.market ?? null,
        };
    } catch (err) {
        console.error("Card facts unavailable:", err instanceof Error ? err.message : err);
        return null;
    }
}

// The condition of one copy, in Cardmarket's words; null clears it.
export async function setCondition(cardId: string, condition: string | null): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), condition: z.string().trim().min(1).max(40).nullable() }).safeParse({ cardId, condition });
    if (!parsed.success) return { ok: false, error: "Invalid input." };
    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { condition: parsed.data.condition } });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}

// A wish becomes a copy you hold, with what is known about it at once: language, condition or
// grade, finish, folder, purchase price and the day you got it (today unless said). One PATCH.
export async function markOwnedWith(cardId: string, edits: CopyEdits): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), edits: copyEdits }).safeParse({ cardId, edits });
    if (!parsed.success) return { ok: false, error: "Invalid input." };
    try {
        await api(`/collection/items/${parsed.data.cardId}`, {
            method: "PATCH",
            body: { owned: true, acquiredAt: new Date().toISOString(), ...parsed.data.edits },
        });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}
