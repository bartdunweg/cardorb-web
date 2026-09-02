import { describe, expect, it } from "vitest";
import { emailSchema } from "./auth";

describe("emailSchema", () => {
    it("takes a trimmed address and refuses anything that is not one", () => {
        expect(emailSchema.parse({ email: "  bart@example.com " })).toEqual({ email: "bart@example.com" });
        expect(emailSchema.safeParse({ email: "not an email" }).success).toBe(false);
        expect(emailSchema.safeParse({ email: "" }).success).toBe(false);
    });
});

describe("signupSchema", () => {
    it("wants a name beside the credentials, trimmed", async () => {
        const { signupSchema } = await import("./auth");
        expect(signupSchema.parse({ name: " Bart ", email: "bart@example.com", password: "12345678" }).name).toBe("Bart");
        expect(signupSchema.safeParse({ name: "  ", email: "bart@example.com", password: "12345678" }).success).toBe(false);
    });
});
