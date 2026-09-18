import { expect, test } from "@playwright/test";

/**
 * A segmented control says which one is on. The kit marked the pressed segment with a fill one step
 * off the rest: #FAFAFA on #FFFFFF (1.04:1) in the light theme and #262626 on #171717 (1.18:1) in
 * the dark, measured on Settings' Theme at 375 px on 2026-09-18. The mark is now a ring in the text
 * colour, and a state indicator needs 3:1 against what is beside it (WCAG 1.4.11). Read-only: the
 * page is only looked at, no segment is pressed.
 */

for (const colorScheme of ["light", "dark"] as const) {
    test(`the chosen theme stands out from the others (${colorScheme})`, async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.emulateMedia({ colorScheme });
        await page.goto("/dashboard/settings");
        const group = page.getByRole("main").getByRole("radiogroup").filter({ hasText: "System" });
        await expect(group.getByRole("radio", { checked: true })).toBeVisible();

        const ratio = await group.evaluate((node) => {
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
            const ratio = (a: string, b: string) => {
                const x = lum(rgb(a));
                const y = lum(rgb(b));
                return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
            };
            const on = node.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')!;
            const off = node.querySelector<HTMLElement>('[role="radio"][aria-checked="false"]')!;
            const offFill = getComputedStyle(off).backgroundColor;
            // The strongest mark the chosen segment carries: its fill, or any ring drawn on it.
            const rings = [...getComputedStyle(on).boxShadow.matchAll(/((?:rgb|lab|oklab|oklch)a?\([^)]*\)) 0px 0px 0px (\d+(?:\.\d+)?)px/g)]
                .filter((m) => parseFloat(m[2]) >= 1)
                .map((m) => m[1]);
            return Math.max(ratio(getComputedStyle(on).backgroundColor, offFill), ...rings.map((c) => ratio(c, offFill)));
        });
        // Measured before: 1.04 (light) and 1.18 (dark).
        expect(ratio).toBeGreaterThanOrEqual(3);
    });
}
