"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validation/auth";

export type AuthState = { error: string } | { success: string } | undefined;

function parseCredentials(formData: FormData) {
    return credentialsSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    });
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
    const parsed = parseCredentials(formData);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: error.message };

    redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
    const parsed = parseCredentials(formData);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp(parsed.data);
    if (error) return { error: error.message };

    // Email confirmation off → a session is returned, so go straight in.
    if (data.session) redirect("/");

    return { success: "Account created. Check your email to confirm, then sign in." };
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}
