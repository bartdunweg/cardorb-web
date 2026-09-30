import { expect, test } from "@playwright/test";

/**
 * A row of stat tiles keeps its figures level.
 *
 * "Pokémon collected" wraps to two lines where a tile is narrow, and its figure stood 20 px under
 * the other three: on Home at 1024 px (536 against 556), on the landing page at 768 (1116 against
 * 1136) and on a phone, where it shares a row with Favorites. StatCard now puts the figure at the
 * foot of the tile, and the row stretches every tile to the tallest, so the figures share a line.
 *
 * Read on Home, signed in, at the 1024 px width where "Pokémon collected" wraps; the figures may
 * be nought, the line they share is the point. (It read the landing page's picture of Home until
 * that picture went, 2026-09-30.)
 */
test("Home's stat tiles keep their figures level", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/dashboard");
    const labels = ["Collection", "Wishlist", "Favorites", "Pokémon collected"];
    for (const label of labels) await expect(page.getByRole("heading", { level: 3, name: label })).toBeVisible();

    const tops = await page.evaluate((names) => {
        const headings = [...document.querySelectorAll("h3")];
        return names.map((n) => {
            const h = headings.find((e) => e.textContent?.trim() === n)!;
            return { label: n, wraps: h.getBoundingClientRect().height > 24, figure: Math.round(h.nextElementSibling!.getBoundingClientRect().top) };
        });
    }, labels);

    // The case the test is for: the long label does wrap at this width, or the test proves nothing.
    expect(tops.find((t) => t.label === "Pokémon collected")?.wraps).toBe(true);
    expect(new Set(tops.map((t) => t.figure)).size).toBe(1);
});
