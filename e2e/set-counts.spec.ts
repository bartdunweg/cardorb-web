import { expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, setTile, writesLanded } from "./support.ts";

/**
 * A set's heading counts what is on screen. A tile taken to nought by its own minus leaves the grid at
 * once, and the heading over it said the old number until the list was read again (bug hunt
 * 2026-09-19). This card is this spec's own: nothing else adds or removes it.
 */
const own = card(15);

test("a set's heading drops by one when a tile's last copy is taken", async ({ page }) => {
    await page.goto(`/dashboard/sets/${SET_ID}`);
    await expect(setTile(page, own, "in your collection").or(addButton(page, own))).toBeVisible();
    if (await addButton(page, own).isVisible()) {
        const settled = cacheCleared(page);
        await addButton(page, own).click();
        await expect(setTile(page, own, "in your collection")).toBeVisible();
        await settled;
    }

    await page.goto("/dashboard/cards");
    const heading = page.getByRole("main").getByRole("heading", { level: 2, name: /^Scarlet & Violet \d+ cards?$/ });
    await expect(heading).toBeVisible();
    const count = async () => Number((await heading.innerText()).match(/(\d+) cards?$/)?.[1]);
    const before = await count();
    expect(before).toBeGreaterThan(0);

    await page.getByRole("button", { name: `Remove ${own.name} from your collection` }).click();
    if (before === 1) await expect(heading).toBeHidden();
    else await expect.poll(count).toBe(before - 1);
    await writesLanded(page);
});
