"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

// An avatar lives in this project's public `avatars` bucket and nowhere else. Anything else is a
// URL every visitor of a public profile would be made to fetch.
const AVATAR_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/avatars/`;
const avatarUrlSchema = z
    .string()
    .trim()
    .url("Enter a valid URL.")
    .refine((u) => u.startsWith(AVATAR_PREFIX), "The avatar must be an uploaded image.");

const profileSchema = z.object({
    display_name: z.string().trim().max(80),
    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters.")
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only."),
    avatar_url: z.union([avatarUrlSchema, z.literal("")]),
    is_public: z.boolean(),
});

export async function updateProfile(input: unknown): Promise<ActionResult> {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    const p = parsed.data;
    const { error } = await supabase
        .from("profiles")
        .update({
            display_name: p.display_name || null,
            username: p.username,
            avatar_url: p.avatar_url || null,
            is_public: p.is_public,
        })
        .eq("id", user.id);

    if (error) return { ok: false, error: error.code === "23505" ? "That username is already taken." : error.message };

    revalidatePath("/dashboard/settings");
    return { ok: true };
}

export async function updateAvatar(url: string | null): Promise<ActionResult> {
    const parsed = z.union([avatarUrlSchema, z.null()]).safeParse(url);
    if (!parsed.success) return { ok: false, error: "Invalid image URL." };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in." };

    const { error } = await supabase.from("profiles").update({ avatar_url: parsed.data }).eq("id", user.id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard/settings");
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
