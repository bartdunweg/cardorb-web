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
 * The set tile's own cache clear, POST /api/forget-mine (use-copy-steps.ts's forgetMineQuietly(),
 * fired once the quiet: true tile's writes have landed). A fresh read (a reload, a second page, a
 * visitor's page) that trusts the tile's own toast or optimistic state instead can race the
 * server; this is the response every such read waits for.
 */
export const cacheCleared = (page: Page) => page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/api/forget-mine") && r.ok());

/** Home's Owned figure: all copies. A new account shows the welcome instead, which is zero. */
export const ownedCount = async (page: Page): Promise<number> => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    if (await page.getByText("Welcome to Cardorb").isVisible()) return 0;
    const text = await page
        .getByRole("link")
        .filter({ has: page.getByRole("heading", { name: "Owned" }) })
        .innerText();
    return Number(text.replace(/[^0-9]/g, ""));
};
