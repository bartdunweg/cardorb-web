"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, api, forgetMe } from "@/lib/api";

export type CollectionResult = { ok: true; id?: string } | { ok: false; error: string };

const failed = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof ApiError ? err.message : "Something went wrong. Try again.",
});

// Collections in the screens are folders in the API. Every call is scoped to the caller there.
export async function createCollection(name: string): Promise<CollectionResult> {
    const parsed = z.string().trim().min(1, "Enter a name.").max(60).safeParse(name);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    try {
        const { folder } = await api<{ folder: { id: string } }>("/folders", { method: "POST", body: { name: parsed.data } });
        await forgetMe();
        revalidatePath("/dashboard", "layout");
        return { ok: true, id: folder.id };
    } catch (err) {
        return failed(err);
    }
}

// The signed-in person's collections, for the slideout's "move to" select.
export async function listCollections(): Promise<{ id: string; name: string }[]> {
    try {
        const { folders } = await api<{ folders: { id: string; name: string }[] }>("/folders");
        return folders.map((f) => ({ id: f.id, name: f.name }));
    } catch {
        return [];
    }
}

export async function deleteCollection(id: string): Promise<CollectionResult> {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) return { ok: false, error: "Invalid collection." };

    try {
        await api(`/folders/${parsed.data}`, { method: "DELETE" });
    } catch (err) {
        return failed(err);
    }

    await forgetMe();
    revalidatePath("/dashboard", "layout");
    return { ok: true };
}

// Files a card in a collection, or takes it out (null). One collection per card, so this moves it.
export async function setCardCollection(cardId: string, collectionId: string | null): Promise<CollectionResult> {
    const parsed = z.object({ cardId: z.string().uuid(), collectionId: z.string().uuid().nullable() }).safeParse({ cardId, collectionId });
    if (!parsed.success) return { ok: false, error: "Invalid input." };

    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { collectionId: parsed.data.collectionId } });
    } catch (err) {
        return failed(err);
    }

    await forgetMe();
    revalidatePath("/dashboard", "layout");
    return { ok: true };
}
