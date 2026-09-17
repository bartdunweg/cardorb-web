"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { createdBinderAnswer } from "@/lib/api-shapes";
import { type BinderRule, type PokedexSetting, binderRuleSchema, pokedexSettingSchema } from "@/lib/binder-rule";
import { getFacets } from "@/lib/cards";
import { type Facets, NO_FACETS } from "@/lib/facets";
import { forgetMine } from "@/lib/user-cache";

export type BinderResult = { ok: true; id?: string } | { ok: false; error: string };

const failed = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof ApiError ? err.message : "Something went wrong. Try again.",
});

const nameSchema = z.string().trim().min(1, "Enter a name.").max(60);

// Binders live in the API; every call is scoped to the caller there. With a rule the binder
// fills itself from the cards you own; without one you file cards in it by hand.
//
// `reread: false` writes and nothing more, as on the card actions: forgetMine() redraws the page
// inside this action's answer, and a dialog that waited for that redraw span for seconds on a
// write that had landed. Such a caller drops the cache itself and refreshes once.
export async function createBinder(
    name: string,
    rule?: BinderRule,
    pokedex?: PokedexSetting,
    isPublic?: boolean,
    { reread = true }: { reread?: boolean } = {},
): Promise<BinderResult> {
    const parsed = z
        .object({ name: nameSchema, rule: binderRuleSchema.optional(), pokedex: pokedexSettingSchema.optional(), isPublic: z.boolean().optional() })
        .safeParse({ name, rule, pokedex, isPublic });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    try {
        const { folder } = await api("/folders", {
            schema: createdBinderAnswer,
            method: "POST",
            body: {
                name: parsed.data.name,
                ...(parsed.data.rule ? { rule: parsed.data.rule } : {}),
                ...(parsed.data.pokedex ? { pokedex: parsed.data.pokedex } : {}),
                ...(parsed.data.isPublic ? { isPublic: true } : {}),
            },
        });
        if (reread) await forgetMine("binders");
        return { ok: true, id: folder.id };
    } catch (err) {
        return failed(err);
    }
}

// A binder's name or rule. The API keeps the kind: a binder filled by hand takes no rule.
export async function updateBinder(
    id: string,
    patch: { name?: string; rule?: BinderRule; pokedex?: PokedexSetting | null; isPublic?: boolean },
    { reread = true }: { reread?: boolean } = {},
): Promise<BinderResult> {
    const parsed = z
        .object({
            id: z.string().uuid(),
            name: nameSchema.optional(),
            rule: binderRuleSchema.optional(),
            pokedex: pokedexSettingSchema.nullable().optional(),
            isPublic: z.boolean().optional(),
        })
        .refine((p) => p.name !== undefined || p.rule !== undefined || p.pokedex !== undefined || p.isPublic !== undefined, "Nothing to change.")
        .safeParse({ id, ...patch });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    try {
        const { id: binderId, ...body } = parsed.data;
        await api(`/folders/${binderId}`, { method: "PATCH", body });
    } catch (err) {
        return failed(err);
    }

    if (reread) await forgetMine("binders");
    return { ok: true, id: parsed.data.id };
}

export type BinderChoice = { id: string; name: string; rule: BinderRule | null };

// The sets and rarities you hold, for a rule's pickers and for reading a rule back. Asked when
// a dialog or a card sheet opens, not by the frame on every screen. Fails soft: without them a
// dialog is poorer, a thrown error is no dialog.
export async function loadFacets(): Promise<Facets> {
    try {
        return await getFacets();
    } catch {
        return NO_FACETS;
    }
}

export async function deleteBinder(id: string): Promise<BinderResult> {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) return { ok: false, error: "Invalid binder." };

    try {
        await api(`/folders/${parsed.data}`, { method: "DELETE" });
    } catch (err) {
        return failed(err);
    }

    await forgetMine("binders");
    return { ok: true };
}
