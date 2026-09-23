import { expect, test } from "@playwright/test";
import { SET_ID, card, setTile } from "./support.ts";

test("a new account opens on Home", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Welcome to Cardorb")).toBeVisible();
});

test("the set page draws the seeded set from our own copy", async ({ page }) => {
    await page.goto(`/sets/${SET_ID}`);
    for (const i of [0, 11]) {
        await expect(setTile(page, card(i), "not in your collection")).toBeVisible();
    }
});
