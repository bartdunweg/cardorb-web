import { expect, test } from "@playwright/test";
import { SET_ID, addButton, card, removeButton, setTile, writesLanded } from "./support.ts";

/* Temporary probe, not for main: who scrolls the set page when the add button of the first row is
   pressed, and does it go with a page that React drew again instead of hydrating. */
test("probe: scroll on the first row's add", async ({ page }) => {
    test.setTimeout(500_000);
    await page.addInitScript(() => {
        const w = window as unknown as { __log: string[] };
        w.__log = [];
        const t = () => Math.round(performance.now());
        let last = -1;
        addEventListener(
            "scroll",
            () => {
                if (scrollY !== last) w.__log.push(`${t()} scroll ${last} -> ${scrollY} active=${document.activeElement?.getAttribute("aria-label")}`);
                last = scrollY;
            },
            true,
        );
        const focus = HTMLElement.prototype.focus;
        HTMLElement.prototype.focus = function (options?: FocusOptions) {
            const before = scrollY;
            focus.call(this, options);
            w.__log.push(
                `${t()} focus() ${this.getAttribute("aria-label")} preventScroll=${options?.preventScroll} scrollY ${before} -> ${scrollY} ${(new Error().stack ?? "").split("\n").slice(2, 4).join(" | ").slice(0, 200)}`,
            );
        };
        const siv = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
            w.__log.push(`${t()} scrollIntoView ${this.getAttribute("aria-label")} ${JSON.stringify(arg)}`);
            siv.call(this, arg);
        };
        addEventListener(
            "pointerdown",
            (e) =>
                w.__log.push(`${t()} pointerdown on ${(e.target as Element).closest("button")?.getAttribute("aria-label")} at ${e.clientY} scrollY=${scrollY}`),
            true,
        );
    });
    const c = card(2);
    const lines: string[] = [];
    for (let round = 1; round <= 20; round++) {
        await page.goto(`/dashboard/sets/${SET_ID}`);
        await expect(setTile(page, c, "not in your collection")).toBeVisible();
        const id = await addButton(page, c).getAttribute("id");
        await addButton(page, c).click();
        await expect(setTile(page, c, "in your collection")).toBeVisible();
        await writesLanded(page);
        const log = await page.evaluate(() => (window as unknown as { __log: string[] }).__log.splice(0));
        const redrawn = await page.evaluate(() => document.querySelector('input[aria-label="Search this set"]')?.id);
        lines.push(`round ${round}: add id at resolve ${id} page redrawn=${redrawn} scrollY=${await page.evaluate(() => scrollY)}\n    ${log.join("\n    ")}`);
        await page
            .getByRole("button", { name: "Close" })
            .first()
            .click()
            .catch(() => undefined);
        await removeButton(page, c).click();
        await expect(setTile(page, c, "not in your collection")).toBeVisible();
        await writesLanded(page);
    }
    console.log(lines.join("\n"));
});
