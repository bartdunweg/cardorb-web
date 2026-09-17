import { expect, test } from "@playwright/test";
import { card, literal } from "./support.ts";

/**
 * The command palette: the one search in the app, carried by the sidebar, by Home on a phone and by
 * Add card on every list. It is the way a card is found when its set is not already open, and no
 * test opened it. No writes: this is the finding, not the taking.
 */

test("the command search finds a card by name and opens its sheet", async ({ page }) => {
    const c = card(22);
    await page.goto("/dashboard");

    // The sidebar's trigger on a desktop, Home's on a phone: both open the one palette, and only
    // one of the two is on screen at a width.
    await page
        .getByRole("button", { name: /^Search( a card)?$/ })
        .filter({ visible: true })
        .click();

    const palette = page.getByRole("dialog", { name: "Command menu" });
    await palette.getByRole("textbox", { name: "Search", exact: true }).fill(c.name);

    // The hits are the palette's listbox; a hit's own name starts with the card's.
    const hit = palette.getByRole("option", { name: new RegExp(`^${literal(c.name)}\\b`) });
    await expect(hit).toHaveCount(1);
    await hit.click();

    // The preview of the highlighted hit, and the card in full behind View details.
    await expect(palette.getByText(c.name, { exact: true })).toBeVisible();
    await palette.getByRole("button", { name: "View details" }).click();

    const sheet = page.getByRole("dialog", { name: c.name });
    await expect(sheet.getByRole("heading", { name: c.name, exact: true })).toBeVisible();
});
