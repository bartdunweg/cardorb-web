import { type Locator, type Page, expect } from "@playwright/test";
import fixture from "./fixtures/catalogue.json" with { type: "json" };

export const E2E_USER = {
    email: "e2e@cardorb.test",
    password: "e2e-password-1",
    username: "e2e",
} as const;

/** A string as a literal piece of a RegExp. */
export const literal = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type FixtureCard = { id: string; name: string; localId: string };

export const SET_ID: string = fixture.sets[0].id;

export const card = (index: number): FixtureCard => {
    const row = fixture.cards[index];
    if (!row) throw new Error(`fixture has no card ${index}`);
    return { id: row.id, name: row.name, localId: row.local_id };
};

/* Names as the set tile writes them: "{name} #{number}, {state}". The number is matched loosely
   because the label prints it as the card does (#597), which is not always local_id. */
const onSet = (c: FixtureCard) => `${literal(c.name)} #\\S+`;

export const setTile = (page: Page, c: FixtureCard, state: string): Locator =>
    page.getByRole("button", { name: new RegExp(`^${onSet(c)}, ${literal(state)}$`) });

export const addButton = (page: Page, c: FixtureCard): Locator => page.getByRole("button", { name: new RegExp(`^Add ${onSet(c)} to your collection$`) });

export const addCopyButton = (page: Page, c: FixtureCard): Locator => page.getByRole("button", { name: new RegExp(`^Add a copy of ${onSet(c)}$`) });

export const removeButton = (page: Page, c: FixtureCard): Locator =>
    page.getByRole("button", { name: new RegExp(`^Remove ${onSet(c)} from your collection$`) });

export const wishButton = (page: Page, c: FixtureCard): Locator => page.getByRole("button", { name: new RegExp(`^Add ${onSet(c)} to your wishlist$`) });

/** A card's tile on Collection, Wishlist or Favorites: a button whose text starts with the name. */
export const collectionTile = (page: Page, c: FixtureCard): Locator =>
    page.getByRole("main").getByRole("button", { name: new RegExp(`^${literal(c.name)}\\b`) });

/**
 * The set tile's own cache clear, POST /api/forget-mine (forget-mine.ts's forgetMineQuietly(),
 * fired once the quiet: true tile's writes have landed). A fresh read (a reload, a second page, a
 * visitor's page) that trusts the tile's own toast or optimistic state instead can race the
 * server; this is the response every such read waits for.
 */
export const cacheCleared = (page: Page) => page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/api/forget-mine") && r.ok());

/**
 * Every press on the page has been written and its cache forgotten: `<html>` has lost the
 * `data-unsent-writes` mark (unsent-writes.ts), which goes only once a tile's whole run of writes and
 * its /api/forget-mine have answered. A reload before that races a write still in the air, which a
 * person is asked about first ("Leave site?") and Playwright answers with Leave on its own.
 */
export const writesLanded = (page: Page) => expect(page.locator("html")).not.toHaveAttribute("data-unsent-writes", { timeout: 15000 });

/** Home's Owned figure: all copies. A new account shows the welcome instead, which is zero. */
export const ownedCount = async (page: Page): Promise<number> => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    if (await page.getByText("Welcome to Cardorb").isVisible()) return 0;
    const text = await page
        .getByRole("link")
        .filter({ has: page.getByRole("heading", { name: "Collection", exact: true }) })
        .innerText();
    return Number(text.replace(/[^0-9]/g, ""));
};

/**
 * A binder made the way a person makes one, from the Binders page, and the address of its own
 * page. New binder stands in the sidebar, beside the page title and in the empty state, all three
 * the same dialog; whichever of them the screen is showing will do.
 *
 * The cache clear is registered before the press: binder-form.tsx's save() calls
 * forgetMineQuietly("binders") and refreshes the page only once that has answered, so the tile
 * this reads the address off is drawn after it rather than before.
 */
export const makeBinder = async (page: Page, name: string): Promise<string> => {
    await page.goto("/dashboard/collections");
    await page.getByRole("button", { name: "New binder" }).filter({ visible: true }).first().click();
    const dialog = page.getByRole("dialog");
    // Not getByLabel: the kit's Label renders the required-asterisk span in the DOM whether or not
    // it is shown, so an exact label match can miss where the accessible name does not (auth.setup.ts).
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(name);
    const settled = cacheCleared(page);
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(`${name} is in your Binders now`)).toBeVisible();
    await settled;

    // Inside main: the sidebar keeps a row per binder, with the same name and the same address.
    const tile = page.getByRole("main").getByRole("link", { name: new RegExp(`^${literal(name)}\\b`) });
    await expect(tile).toBeVisible();
    const href = (await tile.getAttribute("href")) ?? "";
    expect(href).toMatch(/^\/dashboard\/collections\/.+/);
    return href;
};
