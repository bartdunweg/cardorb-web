import { type Page, expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, removeButton, setTile, writesLanded } from "./support.ts";

/**
 * A set page opened under an id that is not the canonical one.
 *
 * The API resolves an old or differently cased id to the canonical set, and `getSet` files the
 * page's answer under the id the address asked for. The tiles were handed `set.id`, the canonical
 * one, so a press forgot `setPages:<canonical>` while the entry sat under `setPages:<the url's
 * id>`: nothing was dropped and the page kept its marks and its counts for the rest of its five
 * minutes (#763, which shipped with no test because nothing here opened such an address).
 *
 * Capitals are the cheapest alias to reach: `copiedSetFor` in the API matches an id case blind, so
 * the seeded `sv01` answers to `SV01` with `sv01` in its body, which is exactly the shape of it.
 */
const ALIAS = SET_ID.toUpperCase();

/* This spec's own card: the fixture's only Poké Ball, and no other spec adds or removes it. */
const own = card(24);

/** The Progress data point over the set's cards: what the server last read as held, out of the total. */
const progress = async (page: Page): Promise<number> => {
    const point = page.locator("dl > div").filter({ has: page.getByText("Progress", { exact: true }) });
    const said = await point.locator("dd").innerText();
    const held = said.split(" of ")[0];
    return Number(held.replace(/\D/g, ""));
};

test("a set opened under another spelling of its id still reads back a press", async ({ page }) => {
    await page.goto(`/dashboard/sets/${ALIAS}`);
    // The alias really did resolve: this is the seeded set, under an address it does not answer to itself.
    await expect(page.getByRole("heading", { level: 1, name: "Scarlet & Violet" })).toBeVisible();
    await expect(addButton(page, own)).toBeVisible();
    const before = await progress(page);
    expect(before).toBeGreaterThanOrEqual(0);

    const settled = cacheCleared(page);
    await addButton(page, own).click();
    await expect(page.getByText(`${own.name} is in your collection now`)).toBeVisible();
    await expect(setTile(page, own, "in your collection")).toBeVisible();
    await settled;
    await writesLanded(page);

    // The read that only the right key survives: the tiles' own state is gone, so this is the
    // server's answer for this address and nothing else.
    await page.reload();
    await expect(setTile(page, own, "in your collection")).toBeVisible();
    await expect.poll(() => progress(page)).toBe(before + 1);

    // Put the account back as the rest of the suite expects it, and read the count back once more.
    const removed = cacheCleared(page);
    await removeButton(page, own).click();
    await expect(page.getByText(`${own.name} is out of your collection`)).toBeVisible();
    await removed;
    await writesLanded(page);

    await page.reload();
    await expect(addButton(page, own)).toBeVisible();
    await expect.poll(() => progress(page)).toBe(before);
});
