"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const profileSchema = z.object({
    display_name: z.string().trim().max(80),
    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters.")
        .max(30)
        .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only."),
    avatar_url: z.union([z.string().trim().url("Enter a valid URL."), z.literal("")]),
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
    const parsed = z.union([z.string().url(), z.null()]).safeParse(url);
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

export async function updatePassword(password: string): Promise<ActionResult> {
    const parsed = z.string().min(8, "Password must be at least 8 characters.").max(72).safeParse(password);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    if (error) return { ok: false, error: error.message };

    return { ok: true };
}
