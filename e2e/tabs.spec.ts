import { expect, test } from "@playwright/test";
import { SET_ID } from "./support.ts";

/*
 * The underline tabs over a set's cards (set-cards.tsx with the kit's tabs.tsx). Nothing here
 * presses a card: the tabs only filter what is already on the page.
 */

const setPage = `/sets/${SET_ID}`;

/** The selected tab, its line and the nearest ancestor that clips, all read from the same frame. */
const readTabs = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
        const list = document.querySelector<HTMLElement>('[role="tablist"]');
        if (!list) throw new Error("no tab list on the page");

        const box = list.parentElement;
        const tab = list.querySelector<HTMLElement>('[role="tab"][data-selected]');
        const line = box?.querySelector<HTMLElement>(':scope > span[aria-hidden="true"]');
        if (!box || !tab || !line) throw new Error("no selected tab or no line");

        // The count beside the label, which hangs a pixel outside the tab's own box (`-my-px`).
        const badge = tab.querySelector<HTMLElement>("span.rounded-full");

        let clipper: HTMLElement | null = tab.parentElement;
        while (clipper && getComputedStyle(clipper).overflowY === "visible") clipper = clipper.parentElement;

        return {
            tab: tab.getBoundingClientRect().toJSON() as DOMRect,
            line: line.getBoundingClientRect().toJSON() as DOMRect,
            badge: badge ? (badge.getBoundingClientRect().toJSON() as DOMRect) : null,
            clipperTop: clipper ? clipper.getBoundingClientRect().top : null,
            ratio: window.devicePixelRatio || 1,
        };
    });

test("the line sits square under the selected tab and no clip cuts its count", async ({ page }) => {
    await page.goto(setPage);
    await expect(page.getByRole("tab", { name: /^Owned/ })).toBeVisible();

    for (const name of [/^All/, /^Owned/]) {
        await page.getByRole("tab", { name }).click();
        await expect(page.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");
        // The line travels 200ms to its new tab.
        await page.waitForTimeout(400);

        const { tab, line, badge, clipperTop, ratio } = await readTabs(page);
        const half = 0.5 / ratio + 0.001;

        // Under its own tab at both ends, not a whole 24px out as it was where the list runs wider
        // than the box the line is drawn in.
        expect(Math.abs(line.left - tab.left)).toBeLessThanOrEqual(half);
        expect(Math.abs(line.right - tab.right)).toBeLessThanOrEqual(half);
        // And with both ends on a whole device pixel, so neither end is a soft one.
        expect(Math.round(line.left * ratio) - line.left * ratio).toBeCloseTo(0, 6);
        expect(Math.round(line.right * ratio) - line.right * ratio).toBeCloseTo(0, 6);

        // The badge stands a pixel above the tab, so a scrolling ancestor with no room for it cut
        // the top of its ring off and the pill read as sliced.
        if (badge && clipperTop !== null) expect(badge.top).toBeGreaterThanOrEqual(clipperTop);
    }
});
