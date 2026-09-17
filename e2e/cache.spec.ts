import { expect, test } from "@playwright/test";
import { E2E_USER, SET_ID, addButton, card, collectionTile, removeButton, setTile } from "./support.ts";

const setPage = `/dashboard/sets/${SET_ID}`;

test("after a write, Back and a reload show the new state, not the cached one", async ({ page }) => {
    const c = card(5);
    await page.goto(setPage);
    await expect(setTile(page, c, "not in your collection")).toBeVisible();
    await addButton(page, c).click();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);

    await page.goBack();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await page.reload();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
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
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await visitor.reload();
    await expect(collectionTile(visitor, c)).toHaveCount(1);

    await removeButton(page, c).click();
    await expect(setTile(page, c, "not in your collection")).toBeVisible();

    await visitor.reload();
    await expect(collectionTile(visitor, c)).toHaveCount(0);
    await visitor.context().close();
});
