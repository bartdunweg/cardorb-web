import { describe, expect, it } from "vitest";
import { emailSchema } from "./auth";

describe("emailSchema", () => {
    it("takes a trimmed address and refuses anything that is not one", () => {
        expect(emailSchema.parse({ email: "  bart@example.com " })).toEqual({ email: "bart@example.com" });
        expect(emailSchema.safeParse({ email: "not an email" }).success).toBe(false);
        expect(emailSchema.safeParse({ email: "" }).success).toBe(false);
    });
});
