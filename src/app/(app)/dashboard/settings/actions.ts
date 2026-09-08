"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { avatarAnswer, usernameAnswer } from "@/lib/api-shapes";
import { type PokedexSetting, pokedexSettingSchema } from "@/lib/folder-rule";
import { createClient } from "@/lib/supabase/server";
import { forgetMine } from "@/lib/user-cache";

export type ActionResult = { ok: true } | { ok: false; error: string };

const failed = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof ApiError ? err.message : "Something went wrong. Try again.",
});

const profileSchema = z.object({
    display_name: z.string().trim().max(80),
    // The database's username_shape, which the API applies after lower-casing: a letter or digit
    // first, then letters, digits and hyphens, 2 to 30 in all. No underscores.
    username: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9][a-z0-9-]{1,29}$/, "Use 2 to 30 lowercase letters, numbers and hyphens, starting with a letter or number."),
    is_public: z.boolean(),
    wishlist_public: z.boolean(),
});

// The profile goes through the API: the name and the public flag in one call, the username in its
// own, because the API claims a username as a separate, checked step.
export async function updateProfile(input: unknown): Promise<ActionResult> {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const p = parsed.data;
    try {
        await api("/profile", { method: "PATCH", body: { displayName: p.display_name, isPublic: p.is_public, wishlistPublic: p.wishlist_public } });
        await api("/username", { method: "POST", body: { username: p.username } });
    } catch (err) {
        return failed(err);
    } finally {
        // Two writes, so a failure is not the same as nothing having happened: the name can land
        // and the username then come back 409. Dropping the cache only when both succeed left the
        // sidebar showing the old name for five minutes while the API already held the new one.
        await forgetMine();
    }

    return { ok: true };
}

/**
 * Is this name free? The API answers either way with 200 and a reason for a no.
 *
 * Asked while the field is being typed in, so the answer is known before Save rather than after
 * a 409. A name the field's own rule already refuses is not sent: the shape is the same rule the
 * API applies, and there is no point asking about "A".
 */
export async function checkUsername(name: string): Promise<{ available: boolean; reason?: string } | null> {
    const parsed = profileSchema.shape.username.safeParse(name);
    if (!parsed.success) return { available: false, reason: parsed.error.issues[0].message };
    try {
        return await api(`/usernames/${encodeURIComponent(parsed.data)}`, { schema: usernameAnswer });
    } catch {
        // The check is a courtesy; Save is the answer that counts, and it says why on a 409.
        return null;
    }
}

// An image as a data URL, at most 2 MB decoded; the API stores it and answers with the address.
export async function uploadAvatar(image: string): Promise<ActionResult & { avatarUrl?: string }> {
    const parsed = z
        .string()
        .regex(/^data:image\/(png|jpeg|webp);base64,/, "Use a JPG, PNG or WebP image.")
        .max(4_000_000, "Keep the image under 2 MB.")
        .safeParse(image);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    try {
        const { avatarUrl } = await api("/profile/avatar", { method: "POST", body: { image: parsed.data }, schema: avatarAnswer });
        return { ok: true, avatarUrl };
    } catch (err) {
        return failed(err);
    } finally {
        // The picture is stored before the answer is parsed, so an answer this app cannot read
        // (ApiShapeError) is still a write that happened. Drop the cache on the way out either way.
        await forgetMine();
    }
}

export async function removeAvatar(): Promise<ActionResult> {
    try {
        await api("/profile/avatar", { method: "DELETE" });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}

// Changing the password proves the current one first. A session alone is not enough: a stolen
// cookie would otherwise turn into a permanent takeover.
export async function updatePassword(currentPassword: string, password: string): Promise<ActionResult> {
    const parsed = z
        .object({
            currentPassword: z.string().min(1, "Enter your current password."),
            password: z.string().min(8, "Password must be at least 8 characters.").max(72),
        })
        .safeParse({ currentPassword, password });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { ok: false, error: "Not signed in." };

    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: parsed.data.currentPassword });
    if (authError) return { ok: false, error: "Current password is incorrect." };

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { ok: false, error: error.message };

    return { ok: true };
}

/**
 * A new address for the account. Supabase mails a confirmation link to the new address (and, with
 * secure email change on, one to the old); the change lands when it is clicked, so the answer here
 * is "check your inbox", not "done".
 */
export async function updateEmail(email: string): Promise<ActionResult> {
    const parsed = z.string().trim().toLowerCase().email("Enter a valid email address.").safeParse(email);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };
    if (user.email === parsed.data) return { ok: true };

    const { error } = await supabase.auth.updateUser({ email: parsed.data });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

// How the built-in Pokédex shows: which Pokémon you collect and whether the missing ones show.
// Null restores the default, every slot with the missing ones.
export async function updatePokedexSetting(setting: PokedexSetting | null): Promise<ActionResult> {
    const parsed = pokedexSettingSchema.nullable().safeParse(setting);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    try {
        await api("/profile", { method: "PATCH", body: { pokedex: parsed.data } });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}

// A list's one setting, from its own page: whether it shows on the public profile. The wishlist,
// the favorites and the Pokédex each have the flag; a folder you made carries its own.
const listSchema = z.object({ list: z.enum(["wishlist", "favorites", "pokedex"]), shown: z.boolean() });
const FLAG = { wishlist: "wishlistPublic", favorites: "favoritesPublic", pokedex: "pokedexPublic" } as const;

export async function updateListPublic(input: unknown): Promise<ActionResult> {
    const parsed = listSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Something went wrong. Try again." };
    try {
        await api("/profile", { method: "PATCH", body: { [FLAG[parsed.data.list]]: parsed.data.shown } });
    } catch (err) {
        return failed(err);
    }
    await forgetMine();
    return { ok: true };
}
