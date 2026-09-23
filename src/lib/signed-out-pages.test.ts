import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { isProtected } from "@/lib/supabase/middleware";

/*
 * Every page under (app) either sends a visitor away or opens and explains itself. There is no
 * third answer, and this test exists because the third answer is what a page gets by accident.
 *
 * The owner pressed Home as a visitor and was handed a login form. He had asked for Home. The
 * fix opened six pages, and an open page that forgets to check the session shows a visitor an
 * error where an invitation belonged. The API refuses without a token, so nothing leaks: what
 * breaks is the one impression a stranger gets.
 *
 * Source is read rather than rendered on purpose. Rendering every page means mocking every read
 * each one makes, which is a second copy of the app that drifts. The signed-out e2e crawl is
 * where these addresses are actually opened; this is the guard that fails in `check`, a minute
 * after the mistake rather than twenty.
 */

const APP = join(__dirname, "..", "app", "(app)");

/** Every page.tsx under (app): the path it serves, and the file it serves it from. */
function pages(): { route: string; file: string }[] {
    const found: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) walk(join(dir, entry.name));
            else if (entry.name === "page.tsx") found.push(join(dir, entry.name));
        }
    };
    walk(APP);
    return found.map((file) => ({
        file,
        route:
            "/" +
                relative(APP, join(file, ".."))
                    .replace(/\([^)]+\)\/?/g, "")
                    .replace(/\[[^\]]+\]/g, "sample")
                    .replace(/\/$/, "") || "/",
    }));
}

/** A page's own source and every file in its folder: the work is often one import away. */
function beside(file: string): string {
    const dir = join(file, "..");
    return readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isFile() && /\.tsx?$/.test(e.name) && !e.name.includes(".test."))
        .map((e) => readFileSync(join(dir, e.name), "utf8"))
        .join("\n");
}

describe("every page under (app), for somebody with no account", () => {
    it("finds the pages at all, so a broken walk cannot pass silently", () => {
        expect(pages().length).toBeGreaterThan(8);
    });

    it("never reads a person without first offering to be one", () => {
        /*
         * The rule, and it holds for a page nobody has written yet: an open page that reads
         * something of the reader's has to say what it would say to somebody who is not one.
         * Browse is open and reads nobody, so it owes nothing; Collection is open and reads
         * everything, so it owes an invitation.
         *
         * Named by the module a page reads rather than by a list of pages, because a list is a
         * thing somebody forgets to add to and a read is a thing they cannot leave out.
         */
        const PERSONAL = /@\/lib\/(binders|cards|profile|movers|stats)|getStats|getDexCards|getMyProfile/;
        const silent = pages()
            .filter((p) => !isProtected(p.route))
            .filter((p) => {
                /*
                 * The page and whatever sits beside it. Home reads nothing itself and hands the
                 * work to home-body.tsx in the same folder, so reading page.tsx alone said Home
                 * was fine while it was the page with the most to do. A test that misses the
                 * hardest case is worse than none, because it is believed.
                 */
                const source = beside(p.file);
                if (!PERSONAL.test(source)) return false;
                // Any component whose name ends in SignInInvite counts: Home has its own, because
                // its invitation is three places and a sentence each rather than one block.
                return !(source.includes("session()") && source.includes("SignInInvite"));
            });
        expect(silent.map((p) => p.route).sort()).toEqual([]);
    });

    it("still has open pages that read nobody, so the rule above is not vacuous", () => {
        const open = pages().filter((p) => !isProtected(p.route));
        expect(open.map((p) => p.route)).toContain("/sets");
        expect(open.length).toBeGreaterThan(5);
    });

    it("keeps the three that have nothing to show behind the wall", () => {
        expect(isProtected("/dashboard/settings")).toBe(true);
        expect(isProtected("/dashboard/you")).toBe(true);
        expect(isProtected("/dashboard/design")).toBe(true);
    });

    it("lets the navigation's own pages through", () => {
        for (const route of [
            "/dashboard",
            "/dashboard/cards",
            "/dashboard/wishlist",
            "/dashboard/collections",
            "/dashboard/favorites",
            "/dashboard/pokedex",
            "/sets",
        ]) {
            expect(isProtected(route), route).toBe(false);
        }
    });
});

/**
 * Every route handler, not only pages. Found in review: the rule above reads page folders, and a
 * route.ts that reads a person without its own check would have passed it unseen. Each one here
 * either reads the session itself or is named below with the reason it needs none, so a new route
 * is red until somebody writes that reason down.
 */
const ROUTES_WITHOUT_A_SESSION: Record<string, string> = {
    "api/forget-mine/route.ts": "forgets through forgetMineLater, which reads the session and does nothing without one",
    "api/revalidate/route.ts": "called by the API, behind a shared secret, and names the account it forgets",
    "auth/confirm/route.ts": "the door itself: it turns a mailed link into a session",
    "logo/[file]/route.ts": "a public picture, the same for everybody",
};

describe("every route handler, for somebody with no account", () => {
    const APP_ROOT = join(__dirname, "..", "app");
    const routes: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) walk(join(dir, entry.name));
            else if (entry.name === "route.ts") routes.push(join(dir, entry.name));
        }
    };
    walk(APP_ROOT);
    const named = (file: string) => relative(APP_ROOT, file).replace(/\([^)]+\)\//g, "");

    it("finds the routes at all", () => {
        expect(routes.length).toBeGreaterThan(5);
    });

    it("either reads the session or is named with the reason it needs none", () => {
        const unexplained = routes
            .filter((f) => !/session\(\)|accessToken\(\)/.test(readFileSync(f, "utf8")))
            .map(named)
            .filter((r) => !(r in ROUTES_WITHOUT_A_SESSION));
        expect(unexplained).toEqual([]);
    });

    it("names no route that is gone, so the list cannot rot", () => {
        const present = new Set(routes.map(named));
        expect(Object.keys(ROUTES_WITHOUT_A_SESSION).filter((r) => !present.has(r))).toEqual([]);
    });
});
