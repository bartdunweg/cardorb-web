"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { type BrowseCard, type PokemonCard, pokemonCardFromBrowse } from "@/lib/api-shapes";
import { type Card, getMyCards } from "@/lib/cards";
import { type CopyEdits, copyEdits, sameCard } from "@/lib/copies";
import { LANGUAGES } from "@/lib/languages";
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

// Searches the signed-in person's own collection (for the command palette).
export async function searchMyCards(query: string): Promise<CardHit[]> {
    const parsed = z.string().trim().min(1).max(100).safeParse(query);
    if (!parsed.success) return [];

    const { cards } = await getMyCards({ q: parsed.data, limit: 20 });
    return cards;
}

// Searches the catalogue through the API, which also says whether each hit is already yours.
export async function searchPokemon(query: string): Promise<PokemonCard[]> {
    const parsed = z.string().trim().min(2).max(100).safeParse(query);
    if (!parsed.success) return [];

    try {
        const { cards } = await api<{ cards: BrowseCard[] }>("/catalog/search", { params: { query: parsed.data } });
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

/** One reading of a card's price, from GET /v1/cards/{tcgId}/prices. Euros; null where Cardmarket published nothing. */
export type PricePoint = { date: string; market: number | null; holo: number | null };

// A card's price day by day over the last ninety days, for the sheet. Empty, not an error, for a
// card with no readings yet; and empty when the API cannot answer, since the sheet is open for
// the card, not for its line.
export async function cardPriceHistory(tcgId: string): Promise<PricePoint[]> {
    try {
        const { points } = await api<{ points: PricePoint[] }>(`/cards/${encodeURIComponent(tcgId)}/prices`);
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
    const codes = LANGUAGES.map((l) => l.code);
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
export async function addCopy(cardId: string, edits: CopyEdits, count = 1): Promise<Result> {
    const parsed = copyBody.safeParse({ cardId, count, edits });
    if (!parsed.success) return { ok: false, error: "Invalid input." };
    try {
        await api(`/collection/items/${parsed.data.cardId}/copies`, { method: "POST", body: { ...parsed.data.edits, count: parsed.data.count } });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
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
};

// The card's facts for the sheet: the illustrator, HP, stage, regulation mark and the
// Cardmarket page. Null when the catalogue cannot answer; the sheet is open for the row, not for these.
export async function cardFacts(tcgId: string): Promise<CardFacts | null> {
    try {
        const c = await api<Partial<CardFacts>>(`/cards/${encodeURIComponent(tcgId)}`);
        return {
            illustrator: c.illustrator ?? null,
            hp: c.hp ?? null,
            stage: c.stage ?? null,
            evolveFrom: c.evolveFrom ?? null,
            regulationMark: c.regulationMark ?? null,
            cmUrl: c.cmUrl ?? null,
        };
    } catch (err) {
        console.error("Card facts unavailable:", err instanceof Error ? err.message : err);
        return null;
    }
}
