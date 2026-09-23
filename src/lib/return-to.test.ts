import { describe, expect, it } from "vitest";
import { safeReturn, withReturn } from "@/lib/return-to";

/*
 * The half of this that matters is what it refuses. `next` arrives through the browser, so it is
 * a stranger's input, and a redirect that follows it anywhere is this app lending its name to
 * whatever it points at.
 */
describe("safeReturn", () => {
    it("keeps a path of this app, query and all", () => {
        expect(safeReturn("/sets/base1?language=ja")).toBe("/sets/base1?language=ja");
    });

    it("refuses another site", () => {
        expect(safeReturn("https://evil.example/pay")).toBeNull();
    });

    it("refuses a protocol relative address, which a browser reads as a host", () => {
        expect(safeReturn("//evil.example/pay")).toBeNull();
    });

    it("refuses a back slash, which some parsers fold to a forward one", () => {
        expect(safeReturn("/\\evil.example")).toBeNull();
        expect(safeReturn("/sets\\..\\login")).toBeNull();
    });

    it("refuses a tab, a newline or a carriage return, which URL parsing strips to make a host", () => {
        // Found in review before this reached production: "/\t/evil.com" passed every check
        // below and resolved to https://evil.com/, a real cardorb.com sign-in page that lands a
        // freshly signed-in person on somebody else's site.
        expect(safeReturn("/\t/evil.com")).toBeNull();
        expect(safeReturn("/\n/evil.com")).toBeNull();
        expect(safeReturn("/\r//evil.com")).toBeNull();
        expect(safeReturn("/%09/evil.com")).not.toBe("//evil.com");
    });

    it("never answers anything that resolves off this site", () => {
        for (const sneaky of ["/\t/evil.com", "/ /evil.com", "/\u0000/evil.com", "/.//evil.com", "/%2F%2Fevil.com"]) {
            const safe = safeReturn(sneaky);
            if (safe !== null) expect(new URL(safe, "https://cardorb.com").origin, sneaky).toBe("https://cardorb.com");
        }
    });

    it("refuses the doors themselves, which would look like a sign-in that did nothing", () => {
        expect(safeReturn("/login")).toBeNull();
        expect(safeReturn("/signup?next=%2F")).toBeNull();
        expect(safeReturn("/reset-password")).toBeNull();
    });

    it("refuses what is not a string, and what is absurd", () => {
        expect(safeReturn(undefined)).toBeNull();
        expect(safeReturn(["/sets"])).toBeNull();
        expect(safeReturn(`/${"a".repeat(600)}`)).toBeNull();
    });
});

describe("withReturn", () => {
    it("carries the page the visitor is on", () => {
        expect(withReturn("/login", "/sets/base1")).toBe("/login?next=%2Fsets%2Fbase1");
    });

    it("leads to the plain door where the page cannot be carried", () => {
        expect(withReturn("/login", "https://evil.example")).toBe("/login");
        expect(withReturn("/login", "/login")).toBe("/login");
    });
});
