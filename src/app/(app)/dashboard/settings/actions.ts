"use server";

import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { forgetMine } from "@/lib/user-cache";

export type ActionResult = { ok: true } | { ok: false; error: string };

const failed = (err: unknown): { ok: false; error: string } => ({
    ok: false,
    error: err instanceof ApiError ? err.message : "Something went wrong. Try again.",
});

const profileSchema = z.object({
    display_name: z.string().trim().max(80),
    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters.")
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only."),
    is_public: z.boolean(),
});

// The profile goes through the API: the name and the public flag in one call, the username in its
// own, because the API claims a username as a separate, checked step.
export async function updateProfile(input: unknown): Promise<ActionResult> {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const p = parsed.data;
    try {
        await api("/profile", { method: "PATCH", body: { displayName: p.display_name, isPublic: p.is_public } });
        await api("/username", { method: "POST", body: { username: p.username } });
    } catch (err) {
        return failed(err);
    }

    await forgetMine();
    return { ok: true };
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
        const { avatarUrl } = await api<{ avatarUrl: string }>("/profile/avatar", { method: "POST", body: { image: parsed.data } });
        await forgetMine();
        return { ok: true, avatarUrl };
    } catch (err) {
        return failed(err);
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
