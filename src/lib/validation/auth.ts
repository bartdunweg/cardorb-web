import { z } from "zod";

/** Credentials for sign-in and sign-up. */
export const credentialsSchema = z.object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
});

export type Credentials = z.infer<typeof credentialsSchema>;

/** What sign-up asks: the credentials plus the name the profile will carry. */
export const signupSchema = credentialsSchema.extend({
    name: z.string().trim().min(1, "Enter your name.").max(60, "Use at most 60 characters."),
});

/** A password on its own, for the page a recovery link lands on. Same floor as sign-up. */
export const newPasswordSchema = z.object({
    password: z.string().min(8, "Use at least 8 characters.").max(72, "Use at most 72 characters."),
});

/** An address on its own, for asking for a password-reset link. */
export const emailSchema = z.object({
    email: z.string().trim().email("Enter a valid email address."),
});
