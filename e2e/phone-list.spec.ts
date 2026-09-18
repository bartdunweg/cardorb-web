import { type Page, expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, collectionTile, setTile } from "./support.ts";

/**
 * A list page on a phone. On a page the tab bar reaches (My cards, Browse) the search field is the
 * bar's first line, in the title's place, beside View and the dots; on a page with Back (a set, a
 * binder) it is a button there, and a press turns the bar into the field with Cancel (Gojek and
 * Keeta on Mobbin). Under it one line of Filters, Sort and each filter, scrolling sideways, each
 * filter opening a sheet from the bottom.
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
        // Wait for the tile either way first: `isVisible` does not wait, and read before the grid was in it said no.
        await expect(setTile(page, c, "in your collection").or(addButton(page, c))).toBeVisible();
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
            [...document.querySelectorAll("button")].some(
                // By its words or its label: the dots say "Collection settings" only to a screen reader.
                (b) =>
                    (b.textContent?.includes(label) || b.getAttribute("aria-label")?.includes(label)) &&
                    Object.keys(b).some((k) => k.startsWith("__reactFiber$")),
            ),
        name,
    );

test("My cards has its field in the bar, in the title's place, beside View and the dots", async ({ page }) => {
    await page.goto("/dashboard/cards");
    const field = page.getByRole("combobox", { name: "Search in Collection" });
    await expect(field).toBeVisible();
    const settings = page.getByRole("button", { name: "Collection settings" });
    const view = page.getByRole("button", { name: /^View/ });
    const [f, d, v] = await Promise.all([field.boundingBox(), settings.boundingBox(), view.boundingBox()]);
    // One line at the top: the field, then View, then the dots.
    expect(f!.y).toBeLessThan(40);
    expect(Math.abs(f!.y + f!.height / 2 - (d!.y + d!.height / 2))).toBeLessThanOrEqual(2);
    expect(f!.x + f!.width).toBeLessThanOrEqual(v!.x);
    expect(v!.x).toBeLessThan(d!.x);
    // The title is for a screen reader only: the tab bar says where you are.
    await expect(page.getByRole("heading", { level: 1, name: "My cards" })).toHaveCSS("position", "absolute");

    await hydrated(page, "Collection settings");
    await field.click();
    await page.keyboard.type("Toedscr", { delay: 60 });
    await expect(page).toHaveURL(/[?&]q=Toedscr(&|$)/);
    await expect(collectionTile(page, toedscruel)).toBeVisible();
    await expect(collectionTile(page, toedscool)).toBeHidden();

    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(field).toHaveValue("");
    await expect(field).toBeFocused();
    await expect(page.getByRole("button", { name: "Clear" })).toBeHidden();
});

test("a page opened with a term shows the field in the bar", async ({ page }) => {
    await page.goto("/dashboard/cards?q=Toeds");
    await expect(page.getByRole("combobox", { name: "Search in Collection" })).toHaveValue("Toeds");
    await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();
});

test("View is in the bar and the filters are one line under the title", async ({ page }) => {
    await page.goto("/dashboard/cards");
    await expect(page.getByRole("button", { name: /^View/ })).toHaveCount(1);
    const filters = page.getByRole("main").getByRole("button", { name: /^Filters/ });
    const sort = page.getByRole("main").getByRole("button", { name: /^Sort/ });
    const rarity = page.getByRole("main").getByRole("button", { name: /^Rarity/ });
    for (const b of [filters, sort, rarity]) await expect(b).toBeVisible();
    const [f, s, r] = await Promise.all([filters.boundingBox(), sort.boundingBox(), rarity.boundingBox()]);
    // One line, in this order.
    expect(Math.round(f!.y)).toBe(Math.round(s!.y));
    expect(Math.round(s!.y)).toBe(Math.round(r!.y));
    expect(f!.x).toBeLessThan(s!.x);
    expect(s!.x).toBeLessThan(r!.x);
    // 40 px, a step under the bar's 44 (hit-areas.spec.ts measures the 44 they are pressed as).
    for (const box of [f, s, r]) expect(Math.round(box!.height)).toBe(40);
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
    // Back on the button that opened it, so a keyboard carries on from where it was.
    await expect(rarity).toBeFocused();
});

test("Collection and Wishlist are tabs of half the line each, under the filters", async ({ page }) => {
    await page.goto("/dashboard/cards");
    const tabs = page.getByRole("main").getByRole("tablist", { name: "My cards" });
    const filters = page.getByRole("main").getByRole("button", { name: /^Filters/ });
    await expect(tabs).toBeVisible();
    const [list, row] = await Promise.all([tabs.boundingBox(), filters.boundingBox()]);
    expect(list!.y).toBeGreaterThan(row!.y + row!.height - 1);
    const [owned, wished] = await Promise.all([
        tabs.getByRole("tab", { name: "Collection" }).boundingBox(),
        tabs.getByRole("tab", { name: "Wishlist" }).boundingBox(),
    ]);
    expect(Math.abs(owned!.width - wished!.width)).toBeLessThanOrEqual(1);
    expect(owned!.width + wished!.width).toBeGreaterThan(list!.width * 0.9);
    // A finger high, where the kit's underline tab is 30 px.
    expect(owned!.height).toBeGreaterThanOrEqual(43);
});

test("a term survives a client navigation away and Back, in the bar of the page it belongs to", async ({ page }) => {
    await page.goto("/dashboard/cards");
    await hydrated(page, "Collection settings");
    await page.getByRole("combobox", { name: "Search in Collection" }).click();
    await page.keyboard.type("Toedscr", { delay: 60 });
    await expect(page).toHaveURL(/[?&]q=Toedscr(&|$)/);

    // A link inside the app, not a load: the page being left is still in the document for a moment.
    await page.getByRole("main").getByRole("tab", { name: "Wishlist" }).click();
    await expect(page).toHaveURL(/\/dashboard\/wishlist/);
    await expect(page.getByRole("combobox", { name: "Search in Wishlist" })).toHaveValue("");
    await expect(page.getByRole("combobox", { name: "Search in Collection" })).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(/[?&]q=Toedscr(&|$)/);
    await expect(page.getByRole("combobox", { name: "Search in Collection" })).toHaveValue("Toedscr");
    await expect(collectionTile(page, toedscool)).toBeHidden();
});

test("a set page's search is a button beside Back; Escape in an empty field and Cancel put the bar back", async ({ page }) => {
    await page.goto(`/dashboard/sets/${SET_ID}`);
    const button = page.getByRole("button", { name: "Search in Scarlet & Violet" });
    await expect(button).toBeVisible();
    await hydrated(page, "Search in Scarlet & Violet");
    const field = page.getByRole("textbox", { name: "Search in Scarlet & Violet" });
    await expect(field).toBeHidden();

    await button.click();
    await expect(field).toBeFocused();
    // Back stays beside the field, and the field starts right after it on the same line.
    const back = page.getByRole("link", { name: "Back to Browse" }).first();
    await expect(back).toBeVisible();
    const [b, f] = await Promise.all([back.boundingBox(), field.boundingBox()]);
    expect(f!.x).toBeLessThan(b!.x + b!.width + 16);
    expect(Math.abs(f!.y + f!.height / 2 - (b!.y + b!.height / 2))).toBeLessThanOrEqual(2);
    await page.keyboard.press("Escape");
    await expect(field).toBeHidden();
    await expect(button).toBeFocused();

    await button.click();
    await page.keyboard.type("Toeds", { delay: 60 });
    await expect(page).toHaveURL(/[?&]q=Toeds(&|$)/);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(field).toBeHidden();
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(button).toBeFocused();
});

test("Browse has its field in the bar, in the title's place", async ({ page }) => {
    await page.goto("/dashboard/sets");
    const field = page.getByRole("combobox", { name: "Search in Browse" });
    await expect(field).toBeVisible();
    expect((await field.boundingBox())!.y).toBeLessThan(40);
    await hydrated(page, "Filters");
    await field.click();
    await page.keyboard.type("Scarlet", { delay: 60 });
    await expect(page).toHaveURL(/[?&]q=Scarlet(&|$)/);
    await expect(
        page
            .getByRole("main")
            .getByRole("link", { name: /Scarlet & Violet/ })
            .first(),
    ).toBeVisible();
});
