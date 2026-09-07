"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { createdFolderAnswer, foldersAnswer } from "@/lib/api-shapes";
import { type Facets, getFacets } from "@/lib/cards";
import { type FolderRule, type PokedexSetting, folderRuleSchema, pokedexSettingSchema } from "@/lib/folder-rule";
import { forgetMine } from "@/lib/user-cache";

export type CollectionResult = { ok: true; id?: string } | { ok: false; error: string };

const failed = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof ApiError ? err.message : "Something went wrong. Try again.",
});

const nameSchema = z.string().trim().min(1, "Enter a name.").max(60);

// Folders live in the API; every call is scoped to the caller there. With a rule the folder
// fills itself from the cards you own; without one you file cards in it by hand.
export async function createCollection(name: string, rule?: FolderRule, pokedex?: PokedexSetting, isPublic?: boolean): Promise<CollectionResult> {
    const parsed = z
        .object({ name: nameSchema, rule: folderRuleSchema.optional(), pokedex: pokedexSettingSchema.optional(), isPublic: z.boolean().optional() })
        .safeParse({ name, rule, pokedex, isPublic });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    try {
        const { folder } = await api("/folders", {
            schema: createdFolderAnswer,
            method: "POST",
            body: {
                name: parsed.data.name,
                ...(parsed.data.rule ? { rule: parsed.data.rule } : {}),
                ...(parsed.data.pokedex ? { pokedex: parsed.data.pokedex } : {}),
                ...(parsed.data.isPublic ? { isPublic: true } : {}),
            },
        });
        await forgetMine();
        return { ok: true, id: folder.id };
    } catch (err) {
        return failed(err);
    }
}

// A folder's name or rule. The API keeps the kind: a folder filled by hand takes no rule.
export async function updateCollection(
    id: string,
    patch: { name?: string; rule?: FolderRule; pokedex?: PokedexSetting | null; isPublic?: boolean },
): Promise<CollectionResult> {
    const parsed = z
        .object({
            id: z.string().uuid(),
            name: nameSchema.optional(),
            rule: folderRuleSchema.optional(),
            pokedex: pokedexSettingSchema.nullable().optional(),
            isPublic: z.boolean().optional(),
        })
        .refine((p) => p.name !== undefined || p.rule !== undefined || p.pokedex !== undefined || p.isPublic !== undefined, "Nothing to change.")
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

export type FolderChoice = { id: string; name: string; rule: FolderRule | null };

// The sets and rarities you hold, for a rule's pickers and for reading a rule back. Asked when
// a dialog or a card sheet opens, not by the frame on every screen. Fails soft: without them a
// dialog is poorer, a thrown error is no dialog.
export async function loadFacets(): Promise<Facets> {
    try {
        return await getFacets();
    } catch {
        return { sets: [], rarities: [], gens: [], types: [] };
    }
}

// Every folder with its rule, for the card sheet: the ones filled by hand are where a card can be
// filed; the rule folders say, by their rule, whether they hold it.
export async function listCollections(): Promise<FolderChoice[]> {
    try {
        const { folders } = await api("/folders", { schema: foldersAnswer });
        return folders.map((f) => ({ id: f.id, name: f.name, rule: f.rule ?? null }));
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
