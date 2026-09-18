import { type Page, expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, collectionTile, setTile } from "./support.ts";

/**
 * A list page on a phone: the search is a button in the bar beside View and the dots, and a press
 * turns the bar into the field with Cancel (Gojek and Keeta on Mobbin); under the title one line of
 * Filters, Sort and each filter, scrolling sideways, each filter opening a sheet from the bottom.
 */
const toedscool = card(22);
const toedscruel = card(23);

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: "e2e/.auth/user.json" })).newPage();
    await page.goto(`/dashboard/sets/${SET_ID}`);
    for (const c of [toedscool, toedscruel]) {
        // search-field.spec.ts may have added them already; a card in the collection is left as it is.
        if (await setTile(page, c, "in your collection").isVisible()) continue;
        const settled = cacheCleared(page);
        await addButton(page, c).click();
        await expect(setTile(page, c, "in your collection")).toBeVisible();
        await settled;
    }
    await page.context().close();
});

/** The page once React owns it: a press before that is lost (early-press.spec.ts). */
const hydrated = (page: Page, name: string) =>
    page.waitForFunction(
        (label) =>
            [...document.querySelectorAll(`button[aria-label], button`)].some(
                (b) => b.textContent?.includes(label) && Object.keys(b).some((k) => k.startsWith("__reactFiber$")),
            ),
        name,
    );

test("the bar's search turns the bar into the field, and Cancel puts it back", async ({ page }) => {
    await page.goto("/dashboard/cards");
    const button = page.getByRole("button", { name: "Search in Collection" });
    await expect(button).toBeVisible();
    await hydrated(page, "Search in Collection");
    // No field in the row until it is asked for.
    await expect(page.getByRole("combobox", { name: "Search in Collection" })).toBeHidden();

    await button.click();
    const field = page.getByRole("combobox", { name: "Search in Collection" });
    await expect(field).toBeFocused();
    // The field is the bar: the dots are gone while it is out.
    await expect(page.getByRole("button", { name: "Collection settings" })).toBeHidden();

    await page.keyboard.type("Toedscr", { delay: 60 });
    await expect(page).toHaveURL(/[?&]q=Toedscr(&|$)/);
    await expect(collectionTile(page, toedscruel)).toBeVisible();
    await expect(collectionTile(page, toedscool)).toBeHidden();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(field).toBeHidden();
    await expect(page.getByRole("button", { name: "Collection settings" })).toBeVisible();
    await expect(button).toBeFocused();
});

test("a page opened with a term shows the field in the bar", async ({ page }) => {
    await page.goto("/dashboard/cards?q=Toeds");
    await expect(page.getByRole("combobox", { name: "Search in Collection" })).toHaveValue("Toeds");
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
});

test("View is in the bar and the filters are one line under the title", async ({ page }) => {
    await page.goto("/dashboard/cards");
    await expect(page.getByRole("button", { name: /^View/ })).toHaveCount(1);
    const filters = page.getByRole("main").getByRole("button", { name: /^Filters/ });
    const sort = page.getByRole("main").getByRole("button", { name: /^Sort/ });
    const rarity = page.getByRole("main").getByRole("button", { name: /^Rarity/ });
    for (const b of [filters, sort, rarity]) await expect(b).toBeVisible();
    const [f, s, r] = await Promise.all([filters.boundingBox(), sort.boundingBox(), rarity.boundingBox()]);
    // One line, in this order, each a finger high.
    expect(Math.round(f!.y)).toBe(Math.round(s!.y));
    expect(Math.round(s!.y)).toBe(Math.round(r!.y));
    expect(f!.x).toBeLessThan(s!.x);
    expect(s!.x).toBeLessThan(r!.x);
    for (const box of [f, s, r]) expect(box!.height).toBeGreaterThanOrEqual(44);
    // The line scrolls sideways; the page does not.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("a filter's button opens its choices as a sheet from the bottom", async ({ page }) => {
    await page.goto("/dashboard/cards");
    const rarity = page.getByRole("main").getByRole("button", { name: /^Rarity/ });
    await hydrated(page, "Rarity");
    await rarity.click();
    const sheet = page.getByRole("dialog", { name: "Rarity" });
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    // Against the bottom of the screen, not a menu under the button.
    expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(812 - 2);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
});
