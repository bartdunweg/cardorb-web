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
        // phone-list.spec.ts may have added them already; a card in the collection is left as it is.
        if (await setTile(page, c, "in your collection").isVisible()) continue;
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

/* Keys 180 ms apart, under the field's 250 ms wait, so a word typed is one write however long it
   takes; only a number here is a pause long enough to write. */
const typeWithPauses = async (page: Page, parts: (string | number)[]) => {
    for (const part of parts) {
        if (typeof part === "number") await page.waitForTimeout(part);
        else await page.keyboard.type(part, { delay: 180 });
    }
};

/** The held-back answer for a term: registered before the keystroke that makes it late, awaited after. */
const answerFor = (page: Page, term: string) =>
    page.waitForResponse((r) => r.url().includes("_rsc=") && new URL(r.url()).searchParams.get("q") === term, { timeout: 15000 });

test("Collection keeps the letters typed while the last answer is on its way", async ({ page }) => {
    await slowAnswers(page);
    await page.goto("/dashboard/cards");
    const search = await field(page, "Search in Collection");
    await search.click();
    /* "Toeds" is written after 250 ms and held 1.5 s; "cruel" is still being typed when it lands.
       A smoke test: the old field only lost letters when the answer landed in the 250 ms after the
       last key, a window this cannot hit reliably (tried against the old field, 2026-09-18). The
       two tests under this one do fail on the old field. */
    const late = answerFor(page, "Toeds");
    await typeWithPauses(page, ["Toeds", 1300, "cruel"]);
    await late;

    await expect(search).toHaveValue("Toedscruel");
    await expect(page).toHaveURL(/[?&]q=Toedscruel(&|$)/, { timeout: 10000 });
    await expect(collectionTile(page, toedscruel)).toBeVisible();
    await expect(collectionTile(page, toedscool)).toBeHidden();
});

test("typing back to the term the list already has leaves both saying it", async ({ page }) => {
    await slowAnswers(page);
    await page.goto("/dashboard/cards?q=Toeds");
    const search = await field(page, "Search in Collection");
    await search.click();
    await page.keyboard.press("End");
    const late = answerFor(page, "Toedsc");
    await typeWithPauses(page, ["c", 600]);
    await page.keyboard.press("Backspace");
    // The answer for "Toedsc" lands after the box went back to "Toeds": the box wins and is written again.
    await late;

    await expect(search).toHaveValue("Toeds");
    await expect(page).toHaveURL(/[?&]q=Toeds(&|$)/, { timeout: 10000 });
    await expect(collectionTile(page, toedscool)).toBeVisible();
    await expect(collectionTile(page, toedscruel)).toBeVisible();
});

test("emptying the field while an answer is on its way empties the search", async ({ page }) => {
    await slowAnswers(page);
    await page.goto("/dashboard/cards");
    const search = await field(page, "Search in Collection");
    await search.click();
    const late = answerFor(page, "Toedscr");
    await typeWithPauses(page, ["Toedscr", 600]);
    await search.fill("");
    await late;

    await expect(search).toHaveValue("");
    await expect(page).not.toHaveURL(/[?&]q=/, { timeout: 10000 });
    await expect(collectionTile(page, toedscool)).toBeVisible();
});

test("a filter picked while a term is on its way keeps both", async ({ page }) => {
    await slowAnswers(page);
    await page.goto("/dashboard/cards?q=Toeds");
    const search = await field(page, "Search in Collection");
    await search.click();
    await page.keyboard.press("End");
    await typeWithPauses(page, ["cruel", 400]);
    // The sheet's link is built from the page's older term: the field has to write its own again.
    await page.getByRole("button", { name: /^Filters/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("row", { name: "Uncommon" }).click();
    await sheet.getByRole("button", { name: /^Show/ }).click();

    await expect(page).toHaveURL(/[?&]rarity=Uncommon/, { timeout: 10000 });
    await expect(page).toHaveURL(/[?&]q=Toedscruel(&|$)/, { timeout: 10000 });
    await expect(search).toHaveValue("Toedscruel");
    await expect(collectionTile(page, toedscruel)).toBeVisible();
});

test("a binder's field offers the titles it holds, and a title chosen is the search", async ({ page }) => {
    await page.goto("/dashboard/cards");
    const search = await field(page, "Search in Collection");
    await search.click();
    await page.keyboard.type("Toed", { delay: 40 });
    const offered = page.getByRole("listbox");
    await expect(offered.getByRole("option", { name: /Toedscruel/ })).toBeVisible();
    await offered.getByRole("option", { name: /Toedscruel/ }).click();

    await expect(search).toHaveValue("Toedscruel");
    await expect(page).toHaveURL(/[?&]q=Toedscruel(&|$)/);
    await expect(collectionTile(page, toedscool)).toBeHidden();
});

// A smoke test: the set page writes with the history API, so no answer comes back to race.
test("a set page keeps the letters typed and narrows its grid", async ({ page }) => {
    await page.goto(`/dashboard/sets/${SET_ID}`);
    const search = await field(page, "Search in Scarlet & Violet");
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
    const search = await field(page, "Search in Browse");
    const shelf = page
        .getByRole("main")
        .getByRole("link", { name: /Scarlet & Violet/ })
        .first();
    await expect(shelf).toBeVisible();
    await search.click();
    await typeWithPauses(page, ["Scar", 600, "let"]);

    // The set stays on screen through the pause: no skeleton in its place while the term is asked.
    for (let i = 0; i < 6; i++) {
        await expect(shelf).toBeVisible();
        await page.waitForTimeout(300);
    }
    await expect(page).toHaveURL(/[?&]q=Scarlet(&|$)/, { timeout: 10000 });
    await expect(search).toHaveValue("Scarlet");
    await expect(shelf).toBeVisible();
});
