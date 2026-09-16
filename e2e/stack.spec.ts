import { expect, test } from "@playwright/test";

test("a new account opens on Home", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Welcome to Cardorb")).toBeVisible();
});
