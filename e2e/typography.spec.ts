import { expect, test } from "@playwright/test";
import { hydrated } from "./support.ts";

/**
 * A paragraph never ends on a word, or a figure and its unit, alone.
 *
 * The Pokédex's rarity note at 768 px wrapped with "none." by itself on its second line (688 px of
 * line, then 37), and the Import dialog's description at 1024 px with "2 MB." (566, then 38).
 * globals.css sets `text-wrap: pretty` on every paragraph, which takes a second word down with a
 * lone last one; and a size is written with a no-break space, so "2" and "MB" are one word to the
 * line breaker and the pair is never the whole last line: it now ends "to 2 MB.".
 *
 * Read-only: the dialog is opened and closed, and no file is chosen.
 */
test("the Import dialog's description wraps without a lone last line", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 820 });
    await page.goto("/dashboard/settings");
    const row = page.getByRole("main").getByRole("button", { name: "Import a CSV file" });
    await hydrated(row);
    await row.click();

    const description = page.getByRole("dialog").getByText(/A CSV export from Dex/);
    await expect(description).toBeVisible();
    expect(await description.evaluate((el) => getComputedStyle(el).textWrapStyle)).toBe("pretty");
    // The figure and its unit joined, so the line breaker cannot part them or leave them alone.
    expect(await description.textContent()).toContain("2 MB");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
});
