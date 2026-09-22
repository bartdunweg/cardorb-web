import { type Page, expect, test } from "@playwright/test";
import { E2E_USER, SET_ID, makeBinder } from "./support.ts";

/**
 * Every page the app has, opened once: the signed-in routes under `src/app/(app)` plus the public
 * profile. It is the cheapest test in the suite and the widest, and it is here for the failure no
 * scenario test can see, a page that has stopped rendering at all. A read that throws, a component
 * that no longer builds, a route whose data shape changed: none of those show up in the tests for
 * adding a card, because those only ever open the three or four pages they act on.
 *
 * Three things fail a route: no main heading (the page did not draw), a document or `/api/` answer
 * of 500 or worse (the server or one of the page's own reads broke), and a console error the
 * allowed list below does not name. One page load per route and no writes, so the whole file costs
 * the API nothing and stays well inside its write limit. The one exception is the binder made in
 * `beforeAll`: `/dashboard/collections/[id]` is not a route a new account can reach at all until a
 * binder exists, and nothing else in the suite makes one.
 */

const BINDER = "Crawl binder";

/**
 * Console errors that are not faults. Each is here because the local stack differs from production
 * in a way the app cannot do anything about; anything else fails the route it appeared on. A
 * message that looks like a real fault belongs in a bug report, not in this list.
 */
const ALLOWED: { pattern: RegExp; why: string }[] = [
    {
        // The tag is in the root layout (`SpeedInsights`, src/app/layout.tsx) and its script is
        // served by Vercel's own edge, which `next start` on localhost is not. It 404s on every
        // page here and Chromium says so once per load. Nothing on the page waits for it.
        pattern: /_vercel\/speed-insights/,
        why: "Speed Insights' script is a Vercel edge route the local stack does not serve",
    },
    {
        // Every picture in the app is a file of ours on images.cardorb.com, drawn through the
        // image optimizer (card-image.tsx, next.config.mjs). On the CI runner that hostname
        // resolves to 0.0.0.0, so Next refuses to fetch it and answers /_next/image with 400:
        // "upstream image ... hostname resolved to private IP [\"0.0.0.0\"]", once per picture, in
        // e2e-web.log. Where the browser asks for the file itself rather than through the
        // optimizer, the same DNS answers it net::ERR_CONNECTION_REFUSED (CI run 35289483169, the
        // public profile). The same addresses answer 200 from here and through the optimizer on
        // cardorb.com (checked 2026-09-18), so this is the runner's DNS and not the app. It means
        // no picture draws anywhere in this stack, which is why no test in the suite reads one.
        pattern: /\/_next\/image\?|https:\/\/images\.cardorb\.com\//,
        why: "images.cardorb.com resolves to 0.0.0.0 on the CI runner, so the optimizer refuses every picture",
    },
];

/** What a page load is allowed to leave behind: a console error, an uncaught error, a 500. */
const watch = (page: Page): string[] => {
    const faults: string[] = [];
    const keep = (line: string) => {
        if (!ALLOWED.some((a) => a.pattern.test(line))) faults.push(line);
    };
    page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        // The location too: a failed subresource says only "Failed to load resource" in its text,
        // and which resource it was is the whole of what makes that message readable.
        keep(`console error: ${msg.text()} (${msg.location().url})`);
    });
    // An exception that reaches the top is reported here, not through the console event.
    page.on("pageerror", (err) => keep(`uncaught: ${err.message}`));
    page.on("response", (res) => {
        if (res.status() < 500) return;
        const isDocument = res.request().resourceType() === "document";
        if (!isDocument && !new URL(res.url()).pathname.startsWith("/api/")) return;
        keep(`${res.status()} ${res.request().method()} ${res.url()}`);
    });
    return faults;
};

/* Filled in by beforeAll: the binder it makes, so the list below can include a binder's own page.
   That one address is the reason a route's path is a function: it is not known when this file is
   collected, only when the tests run. */
let binderPath = "";

/** Every route, named as the app names the page, with the h1 it must draw. */
const ROUTES: { name: string; path: () => string; heading: string | RegExp }[] = [
    // The list Home is about; Home itself while the account holds nothing.
    { name: "Home", path: () => "/dashboard", heading: /^(Collection|Home)$/ },
    { name: "Collection", path: () => "/dashboard/cards", heading: "Collection" },
    { name: "Wishlist", path: () => "/dashboard/wishlist", heading: "Wishlist" },
    { name: "Favorites", path: () => "/dashboard/favorites", heading: "Favorites" },
    { name: "Binders", path: () => "/dashboard/collections", heading: "Binders" },
    { name: "a binder", path: () => binderPath, heading: BINDER },
    // The Pokédex stopped being a page of its own and is a binder now; the address stays and leads
    // to the dex binder. This account has none, so it lands on the invitation to make one, under
    // its own heading: it used to walk off to Binders without a word (pokedex/page.tsx).
    { name: "Pokedex", path: () => "/dashboard/pokedex", heading: "Pokédex" },
    { name: "Browse", path: () => "/sets", heading: "Browse" },
    { name: "a set page", path: () => `/sets/${SET_ID}`, heading: "Scarlet & Violet" },
    { name: "Settings", path: () => "/dashboard/settings", heading: "Settings" },
    // You is titled with its own name; the account's is on the card under it (ui-polish.spec.ts).
    { name: "You", path: () => "/dashboard/you", heading: "You" },
    // Reached by typing the address only, deliberately (CLAUDE.md), which is exactly why nothing
    // else in the suite would notice it breaking.
    { name: "the design system", path: () => "/dashboard/design", heading: "Design system" },
    { name: "the public profile", path: () => `/user/${E2E_USER.username}`, heading: /^e2e$/i },
];

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/user.json" });
    const page = await context.newPage();
    // The only write in this file.
    binderPath = await makeBinder(page, BINDER);
    await context.close();
});

for (const route of ROUTES) {
    test(`${route.name} draws its heading, with no server error and no console error`, async ({ page }) => {
        const faults = watch(page);
        const path = route.path();
        expect(path, "the route's address").not.toBe("");

        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
        // The document and everything it asked the browser for, so a subresource that 404s or a
        // script that throws on the way in is counted. Not networkidle: Speed Insights keeps its
        // own traffic going for as long as the page is open.
        await page.waitForLoadState("load");

        expect(faults, path).toEqual([]);
    });
}
