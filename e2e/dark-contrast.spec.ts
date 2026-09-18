import { type Locator, expect, test } from "@playwright/test";

/**
 * Text on the brand fill in the dark theme. Brand-solid is near-white there (#FAFAFA), so the kit's
 * white text on it vanished: 1.04:1, measured on 2026-09-18 on a phone in the dark. Each place is
 * read here as the pair the browser renders, resolved through a canvas (computed colours are oklab),
 * against the 4.5:1 text needs (WCAG 1.4.3). The design page draws every one of them, and nothing
 * on it is anyone's data, so a picked day is never saved.
 */

/** The contrast ratio between an element's own text colour and its own background. */
const contrast = (el: Locator) =>
    el.evaluate((node) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const rgb = (color: string) => {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
            return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        const lum = (c: number[]) => {
            const [r, g, b] = c.map((v) => {
                const s = v / 255;
                return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const style = getComputedStyle(node);
        const a = lum(rgb(style.color));
        const b = lum(rgb(style.backgroundColor));
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });

test.use({ colorScheme: "dark", viewport: { width: 375, height: 812 } });

test("the current step's number reads on its white disc", async ({ page }) => {
    await page.goto("/dashboard/design");
    const disc = page.getByRole("main").locator('[aria-current="step"] span.rounded-full').first();
    await disc.scrollIntoViewIfNeeded();
    // Measured before: #FFFFFF on #FAFAFA, 1.04:1.
    expect(await contrast(disc)).toBeGreaterThanOrEqual(4.5);
});

test("the picked day and the focused segment read in the calendar", async ({ page }) => {
    await page.goto("/dashboard/design");
    // The second Acquired picker has a day already: 9 July 2026.
    const trigger = page.getByRole("main").locator('[aria-label="Acquired"]').nth(1).getByRole("button").first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const picked = dialog.locator('[role="gridcell"][aria-selected="true"] div').filter({ hasText: /^9$/ }).last();
    await expect(picked).toBeVisible();
    // Measured before: #FFFFFF on #FAFAFA, 1.04:1.
    expect(await contrast(picked)).toBeGreaterThanOrEqual(4.5);

    const segment = dialog.getByRole("spinbutton").first();
    await segment.focus();
    // Measured before: the same 1.04:1 while a segment has focus.
    expect(await contrast(segment)).toBeGreaterThanOrEqual(4.5);

    await page.keyboard.press("Escape");
});
