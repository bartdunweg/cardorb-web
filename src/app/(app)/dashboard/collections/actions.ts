"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { type FolderRule, folderRuleSchema } from "@/lib/folder-rule";
import { forgetMine } from "@/lib/user-cache";

export type CollectionResult = { ok: true; id?: string } | { ok: false; error: string };

const failed = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof ApiError ? err.message : "Something went wrong. Try again.",
});

const nameSchema = z.string().trim().min(1, "Enter a name.").max(60);

// Folders live in the API; every call is scoped to the caller there. With a rule the folder
// fills itself from the cards you own; without one you file cards in it by hand.
export async function createCollection(name: string, rule?: FolderRule): Promise<CollectionResult> {
    const parsed = z.object({ name: nameSchema, rule: folderRuleSchema.optional() }).safeParse({ name, rule });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    try {
        const { folder } = await api<{ folder: { id: string } }>("/folders", {
            method: "POST",
            body: { name: parsed.data.name, ...(parsed.data.rule ? { rule: parsed.data.rule } : {}) },
        });
        await forgetMine();
        return { ok: true, id: folder.id };
    } catch (err) {
        return failed(err);
    }
}

// A folder's name or rule. The API keeps the kind: a folder filled by hand takes no rule.
export async function updateCollection(id: string, patch: { name?: string; rule?: FolderRule }): Promise<CollectionResult> {
    const parsed = z
        .object({ id: z.string().uuid(), name: nameSchema.optional(), rule: folderRuleSchema.optional() })
        .refine((p) => p.name !== undefined || p.rule !== undefined, "Nothing to change.")
        .safeParse({ id, ...patch });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    try {
        const { id: folderId, ...body } = parsed.data;
        await api(`/folders/${folderId}`, { method: "PATCH", body });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true, id: parsed.data.id };
}

// The folders a card can be filed in, for the slideout's select: the ones filled by hand. A
// rule folder decides its own contents.
export async function listCollections(): Promise<{ id: string; name: string }[]> {
    try {
        const { folders } = await api<{ folders: { id: string; name: string; rule?: unknown }[] }>("/folders");
        return folders.filter((f) => !f.rule).map((f) => ({ id: f.id, name: f.name }));
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

    await forgetMine();
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

    await forgetMine();
    return { ok: true };
}
