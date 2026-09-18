import { type Page, expect, test } from "@playwright/test";
import { E2E_USER } from "./support.ts";

/**
 * Every avatar asks for a picture at least the size it is drawn.
 *
 * The public profile drew the kit's 2xl avatar (64 px) at 96 px, and the phone's Home drew the sm
 * one (32 px) at 44: the image's `sizes` still said 64 and 32, so the browser chose a file for the
 * smaller circle and scaled it up. On cardorb.com at a 2x screen the profile's was a 128 px file
 * drawn over 192 device pixels.
 *
 * In this stack the picture comes from the local Supabase, which is not the host the optimizer
 * serves (next.config.mjs), so it arrives as uploaded with no srcset and no `sizes`. What picks
 * the file in production is `sizes`, which is the avatar's width attribute written as pixels, so
 * the width attribute is what is held to the drawn width here; the file itself is checked too,
 * whichever way it came.
 */
test.use({ deviceScaleFactor: 2 });

/** Each visible avatar picture: its drawn width, what its `sizes` asks for, and the file behind it. */
const avatars = (page: Page) =>
    page.locator("[data-avatar-img]").evaluateAll((imgs) =>
        (imgs as HTMLImageElement[])
            .filter((img) => img.getBoundingClientRect().width > 0)
            .map((img) => {
                const w = new URL(img.currentSrc, location.href).searchParams.get("w");
                return {
                    drawn: img.getBoundingClientRect().width,
                    /* What the avatar asks for: `sizes` where the optimizer serves it, and the width
                       attribute, which carries the same number, where it is served direct and next/image
                       writes no `sizes` at all. */
                    asked: img.sizes ? parseFloat(img.sizes) : Number(img.getAttribute("width")),
                    // The optimizer's width where it served the file, the file's own pixels where not.
                    file: w ? Number(w) : img.naturalWidth,
                    loaded: img.complete && img.naturalWidth > 0,
                };
            }),
    );

async function expectSharp(page: Page, where: string) {
    await expect(page.locator("[data-avatar-img]").first()).toBeAttached();
    await expect
        .poll(
            async () => {
                const found = await avatars(page);
                return found.length > 0 && found.every((a) => a.loaded);
            },
            { message: `${where}: an avatar is drawn and loads` },
        )
        .toBe(true);
    for (const a of await avatars(page)) {
        expect(a.asked, `${where}: sizes asks for ${a.asked} px, drawn at ${a.drawn}`).toBeGreaterThanOrEqual(a.drawn);
        expect(a.file, `${where}: a ${a.file} px file for ${a.drawn * 2} device pixels`).toBeGreaterThanOrEqual(a.drawn * 2);
    }
}

test("the public profile's avatar asks for a picture its own size", async ({ browser }) => {
    const visitor = await (await browser.newContext({ deviceScaleFactor: 2 })).newPage();
    await visitor.goto(`/user/${E2E_USER.username}`);
    await expectSharp(visitor, "the public profile");
    await visitor.context().close();
});

test("the phone's Home avatar asks for a picture its own size", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /^You, / })).toBeVisible();
    await expectSharp(page, "Home at phone width");
});

test("the avatars on You and in the sidebar ask for a picture their own size", async ({ page }) => {
    await page.goto("/dashboard/you");
    await expectSharp(page, "You");
});
