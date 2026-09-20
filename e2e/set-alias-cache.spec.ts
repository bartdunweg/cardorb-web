import { type Page, expect, test } from "@playwright/test";
import { SET_ID, SET_NAME, addButton, cacheCleared, card, removeButton, setTile, writesLanded } from "./support.ts";

/**
 * A set page opened under an id that is not the canonical one: the whole address, from the tiles'
 * state to the count over them, has to work and to read a press back.
 *
 * The API resolves an old or differently cased id to the canonical set (`copiedSetFor` matches an
 * id case blind), and `getSet` files the page's answer under the id the address asked for. #763
 * fixed the tiles being handed `set.id` instead, and shipped without a test because nothing here
 * opened such an address.
 *
 * What this spec does not prove is the cache key itself. Run with #763 reverted (a probe commit on
 * web#767) it still passed: the API calls this app's `/api/revalidate` after every write and sends
 * no `write` name, which reads as `all`, so the person's whole tag goes and no set page can be
 * stale whatever the tile named. The narrowing is held by `src/lib/sets.test.ts` instead. This is
 * the address itself: that an alias id draws the set, takes a press and reads it back.
 */
const ALIAS = SET_ID.toUpperCase();

/* This spec's own card: the fixture's only Poké Ball, and no other spec adds or removes it. */
const own = card(24);

/** The Progress data point over the set's cards: what the server last read as held, out of the total. */
const progress = async (page: Page): Promise<number> => {
    const point = page.locator("dl > div").filter({ has: page.getByText("Progress", { exact: true }) });
    const said = await point.locator("dd").innerText();
    // Read before it is counted: a locator that matched another data point would otherwise be
    // stripped down to some number and compared against another wrong number.
    expect(said).toMatch(/^[\d,.]+ of [\d,.]+$/);
    return Number(said.split(" of ")[0].replace(/\D/g, ""));
};

/* Puts the account back however the test ended: a failure between the add and the remove would
   otherwise leave this card owned, and the next run would fail for the wrong reason. */
test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: "e2e/.auth/user.json" });
    await page.goto(`/dashboard/sets/${ALIAS}`);
    if (await setTile(page, own, "in your collection").isVisible()) {
        const settled = cacheCleared(page);
        await removeButton(page, own).click();
        await settled.catch(() => undefined);
    }
    await page.close();
});

test("a set opened under another spelling of its id draws it, takes a press and reads it back", async ({ page }) => {
    await page.goto(`/dashboard/sets/${ALIAS}`);
    // The alias really did resolve: this is the seeded set, under an address it does not name itself by.
    await expect(page.getByRole("heading", { level: 1, name: SET_NAME })).toBeVisible();
    await expect(addButton(page, own)).toBeVisible();
    const before = await progress(page);

    const settled = cacheCleared(page);
    await addButton(page, own).click();
    await expect(page.getByText(`${own.name} is in your collection now`)).toBeVisible();
    await expect(setTile(page, own, "in your collection")).toBeVisible();
    await settled;
    await writesLanded(page);

    // The tiles' own state is gone after this, so what stands is the server's answer for this address.
    await page.reload();
    await expect(setTile(page, own, "in your collection")).toBeVisible();
    await expect.poll(() => progress(page)).toBe(before + 1);

    const removed = cacheCleared(page);
    await removeButton(page, own).click();
    await expect(page.getByText(`${own.name} is out of your collection`)).toBeVisible();
    await removed;
    await writesLanded(page);

    await page.reload();
    await expect(addButton(page, own)).toBeVisible();
    await expect.poll(() => progress(page)).toBe(before);
});
