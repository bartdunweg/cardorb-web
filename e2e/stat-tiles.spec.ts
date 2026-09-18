import { expect, test } from "@playwright/test";

/**
 * A row of stat tiles keeps its figures level.
 *
 * "Pokémon collected" wraps to two lines where a tile is narrow, and its figure stood 20 px under
 * the other three: on Home at 1024 px (536 against 556), on the landing page at 768 (1116 against
 * 1136) and on a phone, where it shares a row with Favorites. StatCard now puts the figure at the
 * foot of the tile, and the row stretches every tile to the tallest, so the figures share a line.
 *
 * Read on the landing page, which draws the same four tiles from fixed figures, so the test needs no
 * cards in the account; a visitor's context, since the signed-in one is sent on to Home.
 */
test("the landing page's stat tiles keep their figures level", async ({ browser }) => {
    // Signed out on purpose: a context made here inherits the project's storageState, which sends "/" on to Home.
    const visitor = await (await browser.newContext({ viewport: { width: 768, height: 1024 }, storageState: { cookies: [], origins: [] } })).newPage();
    await visitor.goto("/");
    const labels = ["Owned", "Wishlist", "Favorites", "Pokémon collected"];
    for (const label of labels) await expect(visitor.getByRole("heading", { level: 3, name: label })).toBeVisible();

    const tops = await visitor.evaluate((names) => {
        const headings = [...document.querySelectorAll("h3")];
        return names.map((n) => {
            const h = headings.find((e) => e.textContent?.trim() === n)!;
            return { label: n, wraps: h.getBoundingClientRect().height > 24, figure: Math.round(h.nextElementSibling!.getBoundingClientRect().top) };
        });
    }, labels);

    // The case the test is for: the long label does wrap at this width, or the test proves nothing.
    expect(tops.find((t) => t.label === "Pokémon collected")?.wraps).toBe(true);
    expect(new Set(tops.map((t) => t.figure)).size).toBe(1);
    await visitor.context().close();
});
