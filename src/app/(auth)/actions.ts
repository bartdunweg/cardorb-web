"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema, emailSchema, newPasswordSchema, signupSchema } from "@/lib/validation/auth";

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

    redirect("/dashboard");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
    const parsed = signupSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const { name, email, password } = parsed.data;
    const supabase = await createClient();
    // The name travels as user metadata, so it is on the account whatever creates the profile.
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
    if (error) return { error: error.message };

    // Email confirmation off → a session is returned, so go straight in. With a session the
    // profile exists and can carry the name now; without one it waits for the first sign-in.
    if (data.session) {
        try {
            await api("/profile", { method: "PATCH", body: { displayName: name } });
        } catch (err) {
            console.error("Setting the display name after sign-up failed:", err instanceof Error ? err.message : err);
        }
        redirect("/dashboard");
    }

    return { success: "Account created. Check your email to confirm, then sign in." };
}

/**
 * The new password after a recovery link. The link's session is proof enough of who this is —
 * it came from the mailbox — so unlike Settings this does not ask for the old password, which is
 * the one thing the person does not have.
 */
export async function setNewPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
    const parsed = newPasswordSchema.safeParse({ password: formData.get("password") });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "That link has expired. Ask for a new one." };

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: error.message };

    redirect("/dashboard");
}

/**
 * Sends the recovery email. The answer is the same whether or not the address has an account,
 * so the form cannot be used to find out which addresses do. The link in the email lands on
 * /auth/confirm, like every other auth email.
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
    const parsed = emailSchema.safeParse({ email: formData.get("email") });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
    if (error) {
        // A rate limit or an outage is worth saying; an unknown address is not.
        console.error("Requesting a password reset failed:", error.message);
        return { error: "That did not go through. Try again in a minute." };
    }

    return { success: "If that email has an account, a link is on its way." };
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
}
