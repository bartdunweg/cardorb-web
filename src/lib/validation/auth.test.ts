import { describe, expect, it } from "vitest";
import { credentialsSchema, emailSchema, signInSchema } from "./auth";

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

describe("signInSchema", () => {
    it("takes any password that is there, short or not, up to 72 characters", () => {
        expect(signInSchema.safeParse({ email: "bart@example.com", password: "short" }).success).toBe(true);
        expect(signInSchema.safeParse({ email: "bart@example.com", password: "" }).success).toBe(false);
        expect(signInSchema.safeParse({ email: "bart@example.com", password: "a".repeat(73) }).success).toBe(false);
        expect(signInSchema.safeParse({ email: "not an email", password: "short" }).success).toBe(false);
    });
});
