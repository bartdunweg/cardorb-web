export const E2E_USER = {
    email: "e2e@cardorb.test",
    password: "e2e-password-1",
    username: "e2e",
} as const;

/** A string as a literal piece of a RegExp. */
export const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
