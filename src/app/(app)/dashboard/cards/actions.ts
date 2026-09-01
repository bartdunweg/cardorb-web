"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMyCards } from "@/lib/cards";
import { createClient } from "@/lib/supabase/server";

export type CardHit = { id: string; name: string; set_name: string | null; number: string | null; image_url: string | null };

// Searches the signed-in user's own collection (for the command palette).
export async function searchMyCards(query: string): Promise<CardHit[]> {
    const parsed = z.string().trim().min(1).max(100).safeParse(query);
    if (!parsed.success) return [];

    const { cards } = await getMyCards({ q: parsed.data, limit: 20 });
    return cards.map((c) => ({ id: c.id, name: c.name, set_name: c.set_name, number: c.number, image_url: c.image_url }));
}

export type PokemonCard = {
    id: string;
    name: string;
    set: string;
    number: string;
    rarity: string | null;
    image: string | null;
    // Extra details shown in the search preview (not all are stored on add).
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
};

const POKEMON_API = "https://api.pokemontcg.io/v2/cards";

async function fetchWithRetry(url: string): Promise<Response | null> {
    const headers: Record<string, string> = process.env.POKEMONTCG_API_KEY ? { "X-Api-Key": process.env.POKEMONTCG_API_KEY } : {};
    for (let i = 0; i < 4; i++) {
        try {
            const res = await fetch(url, { headers, cache: "no-store" });
            if (res.ok) return res;
        } catch {
            // retry
        }
        await new Promise((s) => setTimeout(s, 1200));
    }
    return null;
}

// Searches the Pokémon TCG database by card name (prefix). Returns a trimmed shape for the UI.
export async function searchPokemon(query: string): Promise<PokemonCard[]> {
    const parsed = z.string().trim().min(2).max(100).safeParse(query);
    if (!parsed.success) return [];

    const term = parsed.data.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "*");
    const url = `${POKEMON_API}?q=${encodeURIComponent(`name:${term}*`)}&pageSize=24`;

    const res = await fetchWithRetry(url);
    if (!res) return [];

    const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
    return (json.data ?? []).map((c) => {
        const set = c.set as { name?: string; series?: string; releaseDate?: string; printedTotal?: number } | undefined;
        const images = c.images as { small?: string } | undefined;
        return {
            id: String(c.id),
            name: String(c.name ?? ""),
            set: set?.name ?? "",
            number: String(c.number ?? ""),
            rarity: (c.rarity as string) ?? null,
            image: images?.small ?? null,
            supertype: (c.supertype as string) ?? null,
            subtypes: (c.subtypes as string[]) ?? null,
            hp: (c.hp as string) ?? null,
            types: (c.types as string[]) ?? null,
            artist: (c.artist as string) ?? null,
            series: set?.series ?? null,
            releaseDate: set?.releaseDate ?? null,
            setPrintedTotal: set?.printedTotal ?? null,
            flavorText: (c.flavorText as string) ?? null,
            nationalPokedexNumbers: (c.nationalPokedexNumbers as number[]) ?? null,
        };
    });
}

const cardSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    set: z.string(),
    number: z.string(),
    rarity: z.string().nullable(),
    image: z.string().url().nullable(),
});

// Adds a card from the Pokémon database, either to the owned collection or the wishlist.
export async function addCard(input: PokemonCard, target: "collection" | "wishlist" = "collection"): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = cardSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    const wishlist = target === "wishlist";
    const c = parsed.data;
    const { error } = await supabase.from("cards").insert({
        user_id: user.id,
        name: c.name,
        set_name: c.set || null,
        number: c.number || null,
        rarity: c.rarity,
        image_url: c.image,
        tcg_id: c.id,
        source: "pokemontcg",
        owned: !wishlist,
        wishlist,
        quantity: 1,
        pokedex_numbers: input.nationalPokedexNumbers ?? null,
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath(wishlist ? "/dashboard/wishlist" : "/dashboard/cards");
    return { ok: true };
}

// Moves a wishlist card into the owned collection (the user acquired it).
export async function markOwned(cardId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const parsed = z.string().uuid().safeParse(cardId);
    if (!parsed.success) return { ok: false, error: "Invalid card." };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    // Scope to the owner and check a row actually changed — otherwise RLS can no-op silently.
    const { data, error } = await supabase.from("cards").update({ wishlist: false, owned: true }).eq("id", parsed.data).eq("user_id", user.id).select("id");
    if (error) return { ok: false, error: error.message };
    if (!data?.length) return { ok: false, error: "Card not found in your collection." };

    revalidatePath("/dashboard/wishlist");
    revalidatePath("/dashboard/cards");
    return { ok: true };
}
