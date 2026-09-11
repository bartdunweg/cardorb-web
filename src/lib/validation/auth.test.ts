import { describe, expect, it } from "vitest";
import { credentialsSchema, emailSchema } from "./auth";

describe("emailSchema", () => {
    it("takes a trimmed address and refuses anything that is not one", () => {
        expect(emailSchema.parse({ email: "  bart@example.com " })).toEqual({ email: "bart@example.com" });
        expect(emailSchema.safeParse({ email: "not an email" }).success).toBe(false);
        expect(emailSchema.safeParse({ email: "" }).success).toBe(false);
    });
});

describe("credentialsSchema", () => {
    it("holds the password to the ten characters Supabase holds it to", () => {
        expect(credentialsSchema.safeParse({ email: "bart@example.com", password: "abcdefghi" }).success).toBe(false);
        expect(credentialsSchema.safeParse({ email: "bart@example.com", password: "abcdefghij" }).success).toBe(true);
    });
});
