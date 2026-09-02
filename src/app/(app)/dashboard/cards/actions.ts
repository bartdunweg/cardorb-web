"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, api, forgetMe } from "@/lib/api";
import { type BrowseCard, type PokemonCard, pokemonCardFromBrowse } from "@/lib/api-shapes";
import { getMyCards } from "@/lib/cards";

export type { PokemonCard } from "@/lib/api-shapes";

export type CardHit = { id: string; name: string; set_name: string | null; number: string | null; image_url: string | null };

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
    return cards.map((c) => ({ id: c.id, name: c.name, set_name: c.set_name, number: c.number, image_url: c.image_url }));
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

    await forgetMe();
    revalidatePath("/dashboard", "layout");
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

    await forgetMe();
    revalidatePath("/dashboard", "layout");
    return { ok: true };
}
