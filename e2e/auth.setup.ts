import { expect, test as setup } from "@playwright/test";
import { E2E_USER } from "./support.ts";

setup("sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Password", { exact: true }).fill(E2E_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.context().storageState({ path: "e2e/.auth/user.json" });
});
