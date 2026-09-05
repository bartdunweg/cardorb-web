"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { type BrowseCard, type PokemonCard, pokemonCardFromBrowse } from "@/lib/api-shapes";
import { type Card, getMyCards } from "@/lib/cards";
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
export async function addCard(input: PokemonCard, target: "collection" | "wishlist" = "collection"): Promise<Result> {
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
