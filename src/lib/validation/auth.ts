import { z } from "zod";

/**
 * Credentials for sign-up. Ten characters is the floor Supabase enforces
 * (`minimum_password_length` in the API's supabase/config.toml); the same number here means the
 * form says what the server will say, rather than a green tick and then a refusal.
 */
export const credentialsSchema = z.object({
    email: z.string().email("Enter a valid email address."),
    // The same ceiling as a new password: past 72 Supabase refuses in its own words.
    password: z.string().min(10, "Use at least 10 characters.").max(72, "Use at most 72 characters."),
});

/**
 * Credentials for signing in. The ten-character floor is for choosing a password, not for typing
 * one: an older or shorter password still has to reach Supabase, which answers for itself.
 */
export const signInSchema = z.object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(1, "Enter your password.").max(72, "Use at most 72 characters."),
});

export type Credentials = z.infer<typeof credentialsSchema>;

/** A password on its own, for the page a recovery link lands on. Same floor as sign-up. */
export const newPasswordSchema = z.object({
    password: z.string().min(10, "Use at least 10 characters.").max(72, "Use at most 72 characters."),
});

/** An address on its own, for asking for a password-reset link. */
export const emailSchema = z.object({
    email: z.string().trim().email("Enter a valid email address."),
});
