import { describe, expect, it } from "vitest";
import { cspFor, needsNonce } from "./csp";
import { BOOT_SCRIPT_HASH } from "./theme-script";

describe("needsNonce", () => {
    it("covers the signed-in and auth pages, and nothing public", () => {
        expect(needsNonce("/dashboard")).toBe(true);
        expect(needsNonce("/dashboard/cards")).toBe(true);
        expect(needsNonce("/login")).toBe(true);
        expect(needsNonce("/")).toBe(false);
        expect(needsNonce("/user/bart")).toBe(false);
        expect(needsNonce("/dashboards")).toBe(false);
    });
});

describe("cspFor", () => {
    it("names the nonce, forbids framing and objects, and allows eval only in development", () => {
        const prod = cspFor("abc", false);
        expect(prod).toContain(`script-src 'nonce-abc' 'sha256-${BOOT_SCRIPT_HASH}' 'strict-dynamic'`);
        expect(prod).toContain("frame-ancestors 'none'");
        expect(prod).toContain("object-src 'none'");
        expect(prod).not.toContain("unsafe-eval");
        expect(cspFor("abc", true)).toContain("'unsafe-eval'");
    });
});
