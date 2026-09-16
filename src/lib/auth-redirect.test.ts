import { describe, expect, it } from "vitest";
import { landingFor, linkParamsSchema, loginNoticeFor } from "./auth-redirect";

describe("auth email links", () => {
    it("lands a recovery link on the new-password page, not on Settings", () => {
        expect(landingFor("recovery")).toBe("/reset-password");
    });

    it("lands an address change on Settings and everything else on the dashboard", () => {
        expect(landingFor("email_change")).toBe("/dashboard/settings");
        expect(landingFor("signup")).toBe("/dashboard");
        expect(landingFor("magiclink")).toBe("/dashboard");
    });

    it("rejects a link with no token or an unknown type", () => {
        expect(linkParamsSchema.safeParse({ token_hash: "", type: "signup" }).success).toBe(false);
        expect(linkParamsSchema.safeParse({ token_hash: "abc", type: "sms" }).success).toBe(false);
        expect(linkParamsSchema.safeParse({ token_hash: "abc", type: "recovery" }).success).toBe(true);
    });

    it("shows a notice for a known code only, so a link cannot write its own sentence on the sign-in page", () => {
        expect(loginNoticeFor("expired")).toBe("That link has expired. Ask for a new one.");
        expect(loginNoticeFor("missing")).toBe("That link is missing something.");
        expect(loginNoticeFor("Your account was locked, call 0800")).toBeUndefined();
        expect(loginNoticeFor(undefined)).toBeUndefined();
    });
});
