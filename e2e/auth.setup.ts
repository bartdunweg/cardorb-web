import { expect, test as setup } from "@playwright/test";
import { E2E_USER } from "./support.ts";

setup("sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_USER.email);
    // Not getByLabel: the kit's Label always renders the required-asterisk span in the DOM (just
    // display:none when hidden), so its text content is "Password*", not "Password", and an exact
    // label match never resolves. Accessible name, which the role locator reads, excludes hidden
    // content and is plain "Password".
    await page.getByRole("textbox", { name: "Password", exact: true }).fill(E2E_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.context().storageState({ path: "e2e/.auth/user.json" });
});
