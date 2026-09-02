"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type CollectionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createCollection(name: string): Promise<CollectionResult> {
    const parsed = z.string().trim().min(1, "Enter a name.").max(60).safeParse(name);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    const { data, error } = await supabase.from("collections").insert({ user_id: user.id, name: parsed.data }).select("id").single();
    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/collections");
    return { ok: true, id: (data as { id: string }).id };
}

export async function listCollections(): Promise<{ id: string; name: string }[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("collections").select("id, name").order("created_at", { ascending: true });
    return (data as { id: string; name: string }[] | null) ?? [];
}

export async function deleteCollection(id: string): Promise<CollectionResult> {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) return { ok: false, error: "Invalid collection." };

    const supabase = await createClient();
    const { error } = await supabase.from("collections").delete().eq("id", parsed.data);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/collections");
    return { ok: true };
}

// Assigns (or clears) a card's collection. One collection per card, so this moves the card.
export async function setCardCollection(cardId: string, collectionId: string | null): Promise<CollectionResult> {
    const parsed = z.object({ cardId: z.string().uuid(), collectionId: z.string().uuid().nullable() }).safeParse({ cardId, collectionId });
    if (!parsed.success) return { ok: false, error: "Invalid input." };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    const { data, error } = await supabase
        .from("cards")
        .update({ collection_id: parsed.data.collectionId })
        .eq("id", parsed.data.cardId)
        .eq("user_id", user.id)
        .select("id");
    if (error) return { ok: false, error: error.message };
    if (!data?.length) return { ok: false, error: "Card not found in your collection." };

    revalidatePath("/dashboard/collections");
    revalidatePath("/dashboard/cards");
    return { ok: true };
}
