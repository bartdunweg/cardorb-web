import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { cspFor, needsNonce } from "./csp";
import { BOOT_SCRIPT_HASH } from "./theme-script";

/** Every page.tsx under a route group, as the URL path it serves, with [id] as a sample segment. */
function routesUnder(group: string): string[] {
    const root = join(__dirname, "..", "app", group);
    const pages: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) walk(join(dir, entry.name));
            else if (entry.name === "page.tsx") pages.push(dir);
        }
    };
    walk(root);
    return pages.map((dir) => "/" + relative(root, dir).replace(/\[[^\]]+\]/g, "sample")).map((p) => (p === "/" ? "/" : p));
}

describe("needsNonce", () => {
    it("covers every page under (app) and (auth), so a new page cannot ship un-nonced", () => {
        const routes = [...routesUnder("(app)"), ...routesUnder("(auth)")];
        expect(routes.length).toBeGreaterThan(10);
        for (const route of routes) expect(needsNonce(route), route).toBe(true);
    });

    it("covers nothing public", () => {
        expect(needsNonce("/")).toBe(false);
        expect(needsNonce("/user/bart")).toBe(false);
        expect(needsNonce("/dashboards")).toBe(false);
    });

    it("leaves a path that is no route to the prerendered 404 page, which has no nonce", () => {
        expect(needsNonce("/dashboard/nope")).toBe(false);
        expect(needsNonce("/dashboard/cards/1")).toBe(false);
        expect(needsNonce("/dashboard/collections/abc/x")).toBe(false);
        expect(needsNonce("/login/anything")).toBe(false);
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
