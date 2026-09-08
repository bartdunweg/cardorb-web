import { describe, expect, it } from "vitest";
import { needsNonce } from "./lib/csp";
import { config, needsSession } from "./proxy";

/** The matcher's one pattern, as a regexp, to ask whether the proxy runs on a path at all. */
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("needsSession", () => {
    it("skips the session for the crawler's files, the legal pages and the API reference", () => {
        for (const path of ["/robots.txt", "/sitemap.xml", "/opengraph-image", "/privacy", "/terms", "/docs/api"]) {
            expect(needsSession(path), path).toBe(false);
            // A skipped path must also be one the session is never read for: no nonce, so no
            // per-request render either.
            expect(needsNonce(path), path).toBe(false);
        }
    });

    it("ignores a trailing slash, which is a path Next has not normalised yet", () => {
        expect(needsSession("/privacy/")).toBe(false);
        expect(needsSession("/")).toBe(true);
    });

    it("keeps the session for everything that gates on it or redirects", () => {
        // The protected part, the entry paths that send a signed-in person on, and the public
        // profile, which the middleware still refreshes cookies for.
        for (const path of ["/", "/login", "/signup", "/dashboard", "/dashboard/sets", "/dashboard/sets/base1", "/user/bart"]) {
            expect(needsSession(path), path).toBe(true);
        }
    });
});

describe("the proxy's matcher", () => {
    it("runs on the paths that need a session and on the ones it answers itself", () => {
        for (const path of ["/", "/login", "/dashboard", "/dashboard/cards", "/user/bart", "/robots.txt", "/sitemap.xml"]) {
            expect(matcher.test(path), path).toBe(true);
        }
    });

    it("does not run on static assets, images or the rewritten API", () => {
        for (const path of ["/_next/static/chunks/main.js", "/_next/image", "/favicon.ico", "/api/v1/cards", "/icon.png"]) {
            expect(matcher.test(path), path).toBe(false);
        }
    });
});
