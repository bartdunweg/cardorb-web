import { type Page, expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, collectionTile, setTile } from "./support.ts";

/**
 * A search field keeps what is typed while the list catches up.
 *
 * The field writes its term to the URL a moment after the last keystroke, and the page comes back
 * with it a moment later. Taking that answer put the older term back over what was typed since:
 * "char", a pause, "izard" ended as "char" (web#744). Every page's list answer is held back here
 * for a second and a half, so the answer is always still on its way when the typing goes on.
 */
const toedscool = card(22);
const toedscruel = card(23);

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: "e2e/.auth/user.json" })).newPage();
    await page.goto(`/dashboard/sets/${SET_ID}`);
    for (const c of [toedscool, toedscruel]) {
        const settled = cacheCleared(page);
        await addButton(page, c).click();
        await expect(setTile(page, c, "in your collection")).toBeVisible();
        await settled;
    }
    await page.context().close();
});

/** The page's own answers to a navigation (RSC), held back so a keystroke always lands before one. */
const slowAnswers = (page: Page) =>
    page.route(/[?&]_rsc=/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
    });

/** The field once React owns it: a keystroke before that is lost (early-press.spec.ts). */
const field = async (page: Page, label: string) => {
    await page.waitForFunction(
        (name) => [...document.querySelectorAll(`input[aria-label="${name}"]`)].some((i) => Object.keys(i).some((k) => k.startsWith("__reactFiber$"))),
        label,
    );
    return page.getByLabel(label);
};

const typeWithPauses = async (page: Page, parts: (string | number)[]) => {
    for (const part of parts) {
        if (typeof part === "number") await page.waitForTimeout(part);
        else await page.keyboard.type(part, { delay: 40 });
    }
};

test("Collection keeps the letters typed while the last answer is on its way", async ({ page }) => {
    await slowAnswers(page);
    await page.goto("/dashboard/cards");
    const search = await field(page, "Search your cards");
    await search.click();
    await typeWithPauses(page, ["Toeds", 500, "cr", 500, "uel"]);

    await expect(page).toHaveURL(/[?&]q=Toedscruel(&|$)/, { timeout: 10000 });
    await expect(search).toHaveValue("Toedscruel");
    await expect(collectionTile(page, toedscruel)).toBeVisible();
    await expect(collectionTile(page, toedscool)).toBeHidden();
});

test("typing back to the term the list already has leaves both saying it", async ({ page }) => {
    await slowAnswers(page);
    await page.goto("/dashboard/cards?q=Toeds");
    const search = await field(page, "Search your cards");
    await search.click();
    await page.keyboard.press("End");
    await typeWithPauses(page, ["c", 500]);
    await page.keyboard.press("Backspace");

    // The answer for "Toedsc" lands after the box went back to "Toeds": the box wins and is written again.
    await page.waitForTimeout(4000);
    await expect(search).toHaveValue("Toeds");
    await expect(page).toHaveURL(/[?&]q=Toeds(&|$)/);
    await expect(collectionTile(page, toedscool)).toBeVisible();
    await expect(collectionTile(page, toedscruel)).toBeVisible();
});

test("emptying the field while an answer is on its way empties the search", async ({ page }) => {
    await slowAnswers(page);
    await page.goto("/dashboard/cards");
    const search = await field(page, "Search your cards");
    await search.click();
    await typeWithPauses(page, ["Toedscr", 500]);
    await search.fill("");

    await page.waitForTimeout(4000);
    await expect(search).toHaveValue("");
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(collectionTile(page, toedscool)).toBeVisible();
});

test("a binder's field offers the titles it holds, and a title chosen is the search", async ({ page }) => {
    await page.goto("/dashboard/cards");
    const search = await field(page, "Search your cards");
    await search.click();
    await page.keyboard.type("Toed", { delay: 40 });
    const offered = page.getByRole("listbox");
    await expect(offered.getByRole("option", { name: /Toedscruel/ })).toBeVisible();
    await offered.getByRole("option", { name: /Toedscruel/ }).click();

    await expect(search).toHaveValue("Toedscruel");
    await expect(page).toHaveURL(/[?&]q=Toedscruel(&|$)/);
    await expect(collectionTile(page, toedscool)).toBeHidden();
});

test("a set page keeps the letters typed and narrows its grid", async ({ page }) => {
    await page.goto(`/dashboard/sets/${SET_ID}`);
    const search = await field(page, "Search this set");
    await search.click();
    await typeWithPauses(page, ["Toeds", 400, "cr", 400, "uel"]);

    await expect(page).toHaveURL(/[?&]q=Toedscruel(&|$)/);
    await expect(search).toHaveValue("Toedscruel");
    await expect(setTile(page, toedscruel, "in your collection")).toBeVisible();
    await expect(setTile(page, toedscool, "in your collection")).toBeHidden();
});

test("Browse keeps the letters typed and its sets on screen while it narrows", async ({ page }) => {
    await slowAnswers(page);
    await page.goto("/dashboard/sets");
    const search = await field(page, "Search sets");
    const shelf = page
        .getByRole("main")
        .getByRole("link", { name: /Scarlet & Violet/ })
        .first();
    await expect(shelf).toBeVisible();
    await search.click();
    await typeWithPauses(page, ["Scar", 500, "let"]);

    // The set stays on screen through the pause: no skeleton in its place while the term is asked.
    for (let i = 0; i < 6; i++) {
        await expect(shelf).toBeVisible();
        await page.waitForTimeout(300);
    }
    await expect(page).toHaveURL(/[?&]q=Scarlet(&|$)/, { timeout: 10000 });
    await expect(search).toHaveValue("Scarlet");
    await expect(shelf).toBeVisible();
});
