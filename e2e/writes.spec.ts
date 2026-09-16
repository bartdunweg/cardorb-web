import { expect, test } from "@playwright/test";
import { SET_ID, addButton, card, collectionTile, ownedCount, removeButton, setTile, wishButton } from "./support.ts";

const setPage = `/dashboard/sets/${SET_ID}`;

test("adding a card shows on the tile, on Collection and on Home, before and after a reload", async ({ page }) => {
    const c = card(0);
    const before = await ownedCount(page);

    await page.goto(setPage);
    await addButton(page, c).click();
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await page.reload();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);

    expect(await ownedCount(page)).toBe(before + 1);
});

test("two quick presses on plus make two copies, not one and not three", async ({ page }) => {
    const c = card(1);
    await page.goto(setPage);
    const box = await addButton(page, c).boundingBox();
    if (!box) throw new Error("plus button has no box");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.click(x, y);
    await page.mouse.click(x, y);

    await expect(setTile(page, c, "2 copies")).toBeVisible();
    await page.reload();
    await expect(setTile(page, c, "2 copies")).toBeVisible();

    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);
});

test("removing a card and putting it back leaves it in the collection everywhere", async ({ page }) => {
    const c = card(2);
    await page.goto(setPage);
    await addButton(page, c).click();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await removeButton(page, c).click();
    await expect(page.getByText(`${c.name} is out of your collection`)).toBeVisible();
    await expect(setTile(page, c, "not in your collection")).toBeVisible();

    await page.getByRole("button", { name: "Put back" }).click();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await page.reload();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);
});

test("the star and the Favorites list agree, on and off", async ({ page }) => {
    const c = card(3);
    await page.goto(setPage);
    await addButton(page, c).click();
    await setTile(page, c, "in your collection").click();

    const sheet = page.getByRole("dialog", { name: c.name });
    const star = sheet.getByRole("button", { name: "Favorite" });
    await star.click();
    await expect(star).toHaveAttribute("aria-pressed", "true");

    await page.goto(`/dashboard/favorites?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);

    await collectionTile(page, c).click();
    const again = page.getByRole("dialog", { name: c.name }).getByRole("button", { name: "Favorite" });
    await expect(again).toHaveAttribute("aria-pressed", "true");
    await again.click();
    await expect(again).toHaveAttribute("aria-pressed", "false");

    await page.reload();
    await expect(collectionTile(page, c)).toHaveCount(0);
});

test("a wished card is on the wishlist and not in the collection", async ({ page }) => {
    const c = card(4);
    const before = await ownedCount(page);
    await page.goto(setPage);
    await wishButton(page, c).click();
    await expect(page.getByText(`${c.name} is on your wishlist now`)).toBeVisible();
    await expect(setTile(page, c, "on your wishlist")).toBeVisible();

    await page.goto(`/dashboard/wishlist?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);
    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(0);
    expect(await ownedCount(page)).toBe(before);
});
