"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RECOVERY_COOKIE } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";
import { usernameFromEmail } from "@/lib/username";
import { credentialsSchema, emailSchema, newPasswordSchema, signInSchema } from "@/lib/validation/auth";

/** `existing`: the address on a sign-up already has an account, and the password typed was not its own. */
export type AuthState = { error: string } | { success: string } | { existing: true } | undefined;

function parseCredentials(formData: FormData) {
    return credentialsSchema.safeParse({
        email: formData.get("email"),
        password: formData.get("password"),
    });
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
    // No floor on the length here: an account made before the floor rose still signs in.
    const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: error.message };

    redirect("/dashboard");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
    const parsed = parseCredentials(formData);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const { email, password } = parsed.data;
    const supabase = await createClient();
    // Sign-up asks for no name. The profile still needs a username from its first moment (it is
    // the name in /user/<name>), so one is drawn from the email and travels as user metadata; the
    // database trigger writes it with the account. The display name stays empty until Settings.
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: usernameFromEmail(email) } },
    });
    if (error) return { error: error.message };

    // An address that already has a confirmed account comes back as a user with no identities and
    // no error: Supabase sends nothing and hides that it exists. The form then said "open the link
    // we sent" for a link that never came. Whoever does this has usually forgotten they signed up,
    // so the password they typed may well be the account's own: try it, and they are in. If it is
    // not, the form says the account is there and points to signing in or a new password.
    if (data.user && data.user.identities?.length === 0) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) redirect("/dashboard");
        return { existing: true };
    }

    // Email confirmation off → a session is returned, so go straight in.
    if (data.session) redirect("/dashboard");

    // The link in that email signs the person in; there is no "then sign in" step.
    return { success: `Open the link we sent to ${email} and you are in.` };
}

/**
 * The new password after a recovery link. The link is the proof of who this is (it came from the
 * mailbox), so unlike Settings this does not ask for the old password, which is the one thing the
 * person does not have. The proof is the recovery cookie /auth/confirm wrote, not the session on
 * its own: any session has one of those.
 */
export async function setNewPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
    const parsed = newPasswordSchema.safeParse({ password: formData.get("password") });
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const jar = await cookies();
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user || jar.get(RECOVERY_COOKIE)?.value !== "1") return { error: "That link has expired. Ask for a new one." };

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: error.message };

    // Spent: the next password change goes through Settings and asks for this one.
    jar.delete(RECOVERY_COOKIE);
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

/**
 * Ends this browser's session only. The default scope is global, which also signed out the iOS app
 * and every other device. When Supabase refuses, the session is still there, so the answer says so
 * instead of landing on the home page as if it had worked.
 */
export async function signOut(): Promise<{ error: string } | undefined> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
        console.error("Signing out failed:", error.message);
        return { error: "Signing out did not go through. Try again." };
    }
    redirect("/");
}
