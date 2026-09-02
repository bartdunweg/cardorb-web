import { z } from "zod";

/** Credentials for sign-in and sign-up. */
export const credentialsSchema = z.object({
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
});

export type Credentials = z.infer<typeof credentialsSchema>;
