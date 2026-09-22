import { type Locator, expect, test } from "@playwright/test";
import { SET_ID } from "./support";

/**
 * Controls drawn smaller than a finger are pressed as a 44 px square. Measured on 2026-09-18 at
 * 375 px: the list row's Search, Filters, Sort and View were 36 by 36, the filter sheet's close 36
 * by 36, and quiet words like Clear all, Show more and See all 20 px tall. The size a press lands
 * on is read the way a finger finds it: the element the browser hits, point by point out from the
 * middle. Read-only: the sheet is opened and closed, nothing is pressed inside it.
 */

/** Width and height of the area around an element's middle that the browser says is that element. */
const pressed = (el: Locator) =>
    el.evaluate((node) => {
        const r = node.getBoundingClientRect();
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const hits = (x: number, y: number) => {
            const t = document.elementFromPoint(x, y);
            return !!t && (t === node || node.contains(t));
        };
        const reach = (dx: number, dy: number) => {
            let n = 0;
            while (n < 40 && hits(cx + dx * (n + 1), cy + dy * (n + 1))) n++;
            return n;
        };
        return { width: reach(-1, 0) + reach(1, 0) + 1, height: reach(0, -1) + reach(0, 1) + 1 };
    });

test.use({ viewport: { width: 375, height: 812 } });

test("the list row's buttons and the filter sheet's close are a finger wide", async ({ page }) => {
    await page.goto(`/sets/${SET_ID}`);
    const main = page.getByRole("main");
    // Rarity too: a filter of its own on the phone's line, drawn at 40 and pressed as 44.
    for (const name of [/^Filters/, /^Sort/, /^Rarity/]) {
        const button = main.getByRole("button", { name }).first();
        await expect(button).toBeVisible();
        const size = await pressed(button);
        // Measured before: 36 by 36.
        expect(size.width).toBeGreaterThanOrEqual(43);
        expect(size.height).toBeGreaterThanOrEqual(43);
    }

    await main
        .getByRole("button", { name: /^Filters/ })
        .first()
        .click();
    const dialog = page.getByRole("dialog");
    const close = dialog.getByRole("button", { name: "Close" });
    await expect(close).toBeVisible();
    // The sheet slides in; measure once every animation in it has finished.
    await page.evaluate(() =>
        Promise.all(
            document
                .getAnimations()
                .filter((a) => a.effect?.getTiming().iterations !== Infinity)
                .map((a) => a.finished),
        ),
    );
    const size = await pressed(close);
    // Measured before: 36 by 36.
    expect(size.width).toBeGreaterThanOrEqual(43);
    expect(size.height).toBeGreaterThanOrEqual(43);
    await page.keyboard.press("Escape");
});
