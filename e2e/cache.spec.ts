import { expect, test } from "@playwright/test";
import { E2E_USER, SET_ID, addButton, card, collectionTile, removeButton, setTile } from "./support.ts";

const setPage = `/dashboard/sets/${SET_ID}`;

test("after a write, Back and a reload show the new state, not the cached one", async ({ page }) => {
    const c = card(5);
    await page.goto(setPage);
    await expect(setTile(page, c, "not in your collection")).toBeVisible();
    await addButton(page, c).click();
    // The tile flips at once (use-copy-steps.ts presses optimistically), but the write lands
    // behind it; the toast is the signal the add has actually reached the server, the same wait
    // writes.spec.ts uses before trusting a fresh read (see its "adding a card..." test).
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);

    await page.goBack();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await page.reload();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    // Leaves the account as this test found it: `stack.spec.ts`'s "a new account opens on Home"
    // expects a fully empty account, and Playwright runs spec files in name order, which puts this
    // file (cache.spec.ts) before stack.spec.ts. An unremoved card here would fail that test.
    await removeButton(page, c).click();
    await expect(page.getByText(`${c.name} is out of your collection`)).toBeVisible();
    await expect(setTile(page, c, "not in your collection")).toBeVisible();
});

test("the public profile shows an added card and loses a removed one", async ({ page, browser }) => {
    const c = card(6);
    const visitor = await (await browser.newContext()).newPage();
    const profile = `/user/${E2E_USER.username}?q=${encodeURIComponent(c.name)}`;

    await visitor.goto(profile);
    await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(collectionTile(visitor, c)).toHaveCount(0);

    await page.goto(setPage);
    await addButton(page, c).click();
    // Same race as the test above: the tile answers under the finger, the write lands behind it.
    // CI run 35198515180 (2026-09-17) failed here without this wait: the visitor's reload beat
    // the add to the server and still read zero. The toast is the signal the write has landed.
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await visitor.reload();
    await expect(collectionTile(visitor, c)).toHaveCount(1);

    await removeButton(page, c).click();
    await expect(page.getByText(`${c.name} is out of your collection`)).toBeVisible();
    await expect(setTile(page, c, "not in your collection")).toBeVisible();

    await visitor.reload();
    await expect(collectionTile(visitor, c)).toHaveCount(0);
    await visitor.context().close();
});
