import { expect, test } from "@playwright/test";

/**
 * Collection | Wishlist is one control on two pages, so it stands in one place at one size on both:
 * a press from one to the other should not make it jump. Measured on 2026-09-18 at 390 px: 358 px
 * wide on Collection and 234 on Wishlist, whose page has the settings dots in the bar beside its title,
 * and the switch sat in the title's column, which gives those dots 112 px. Read-only.
 */

test.use({ viewport: { width: 390, height: 844 } });

test("Collection and Wishlist are the same width on both pages", async ({ page }) => {
    const width = async (path: string) => {
        await page.goto(path);
        const tabs = page.getByRole("main").getByRole("tablist", { name: "My cards" });
        await expect(tabs).toBeVisible();
        return (await tabs.boundingBox())!.width;
    };
    const owned = await width("/dashboard/cards");
    const wishlist = await width("/dashboard/wishlist");
    // The column is 390 minus two 16 px gutters.
    expect(owned).toBeCloseTo(358, 0);
    expect(wishlist).toBeCloseTo(owned, 0);
});
