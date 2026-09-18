import { expect, test } from "@playwright/test";
import { SET_ID } from "./support";

/**
 * Every date in the app is written one way, "Jul 9, 2026", whatever language the browser speaks.
 * Measured on 2026-09-18 in an en-GB browser at 390 px: Browse said "Sep 16, 2026", a set page
 * "Released 22 Sept 2023" and an acquired date "17 Jul 2026", three forms on three screens; and
 * react-aria's pickers follow the browser, so a Dutch phone read "9 jul 2026" and "ma di wo" in an
 * English interface. Read-only: the design page's picker is opened and closed, nothing is picked.
 */

test.use({ locale: "nl-NL", viewport: { width: 390, height: 844 } });

test("a set's release date is written the way Browse writes it", async ({ page }) => {
    await page.goto(`/dashboard/sets/${SET_ID}`);
    // The fixture set is released 2023/03/31. Before: "Released 31 Mar 2023", in every browser.
    await expect(page.getByRole("main").getByText(/^Released /)).toHaveText("Released Mar 31, 2023");
});

test("a date picker writes English on a Dutch phone", async ({ page }) => {
    await page.goto("/dashboard/design");
    // The second Acquired picker has a day already: 9 July 2026. Before, on nl-NL: "9 jul 2026".
    const trigger = page.getByRole("main").locator('[aria-label="Acquired"]').nth(1).getByRole("button").first();
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveText("Jul 9, 2026");

    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The month and the weekdays in English, the week still starting on Monday.
    await expect(dialog.getByText("July 2026")).toBeVisible();
    await expect(dialog.locator("th").first()).toHaveText("Mo");
    await page.keyboard.press("Escape");
});
