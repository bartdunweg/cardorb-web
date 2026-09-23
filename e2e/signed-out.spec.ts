import { expect, test } from "@playwright/test";
import { SET_ID, stranger } from "./support.ts";

/**
 * The app as somebody with no account sees it.
 *
 * The half that matters here is what stays shut. The risk this whole change carries is not that
 * too little opened, which anybody notices in a day, it is that too much did, which nobody
 * notices until it is somebody's collection on a stranger's screen. So the closed list below is
 * the point of the file and the open list is its control: without the second, a wall that had
 * fallen over would still pass.
 *
 * Every test runs in `stranger()`, a browser with an empty storage state. Not a bare
 * `browser.newContext()`, which inherits the project's signed-in state: the first run of this file
 * was signed in throughout, and this file is what caught it.
 */

/** Open to anybody, and each one is a page rather than a redirect. */
const OPEN = ["/", "/sets", `/sets/${SET_ID}`, "/login", "/signup", "/privacy", "/terms", "/docs/api"];

/**
 * Open, and about the reader. Each opens and says what an account adds there rather than handing
 * over a login form: pressing Home and being given one is an answer to a question nobody asked.
 */
const INVITED = ["/dashboard", "/dashboard/cards", "/dashboard/wishlist", "/dashboard/collections", "/dashboard/favorites", "/dashboard/pokedex"];

/** Still behind the door: not in a visitor's navigation, and nothing to show. */
const CLOSED = ["/dashboard/settings", "/dashboard/you", "/dashboard/design"];

test.describe("a visitor with no account", () => {
    for (const path of OPEN) {
        test(`may read ${path}`, async ({ browser }) => {
            const visitor = await stranger(browser);
            const open = await visitor.goto(path);
            expect(open?.status(), path).toBeLessThan(400);
            await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();
            await visitor.context().close();
        });
    }

    for (const path of INVITED) {
        test(`is invited rather than turned away at ${path}`, async ({ browser }) => {
            const visitor = await stranger(browser);
            const open = await visitor.goto(path);
            expect(open?.status(), path).toBe(200);
            // The page still says which page it is: one that answers only with a centred block
            // has lost its name.
            await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();
            // A positive before the zero below, so an empty page cannot pass by having nothing.
            const signIn = visitor.getByRole("link", { name: "Sign in" }).first();
            await expect(signIn).toBeVisible();
            await expect(signIn).toHaveAttribute("href", new RegExp(`^/login\\?next=${encodeURIComponent(path).replace(/\//g, "%2F")}`));
            expect(visitor.url(), "stayed on the page it was asked for").toContain(path);
            await visitor.context().close();
        });
    }

    for (const path of CLOSED) {
        test(`is sent to the door at ${path}`, async ({ browser }) => {
            const visitor = await stranger(browser);
            await visitor.goto(path);
            await expect(visitor).toHaveURL(/\/login/);
            // And the door remembers where they were going, so signing in finishes the journey.
            expect(visitor.url()).toContain(`next=${encodeURIComponent(path)}`);
            await visitor.context().close();
        });
    }

    test("a set page shows its cards and nobody's collection", async ({ browser }) => {
        const visitor = await stranger(browser);
        await visitor.goto(`/sets/${SET_ID}`);
        // The cards are there, which is what makes the two absences below mean something.
        await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(visitor.getByRole("button").first()).toBeVisible();
        // Nothing claiming a collection nobody read: not "0 of 60", not a holding filter.
        await expect(visitor.getByText(/\d+ of \d+/)).toHaveCount(0);
        await expect(visitor.getByRole("tab", { name: "Owned" })).toHaveCount(0);
        await visitor.context().close();
    });

    test("the old Browse address still leads somewhere", async ({ browser }) => {
        const visitor = await stranger(browser);
        await visitor.goto("/dashboard/sets");
        await expect(visitor).toHaveURL(/\/sets$/);
        await visitor.context().close();
    });
});
