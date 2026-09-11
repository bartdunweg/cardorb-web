import { z } from "zod";

/**
 * Credentials for sign-in and sign-up. Ten characters is the floor Supabase enforces
 * (`minimum_password_length` in the API's supabase/config.toml); the same number here means the
 * form says what the server will say, rather than a green tick and then a refusal.
 */
export const credentialsSchema = z.object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(10, "Use at least 10 characters."),
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
