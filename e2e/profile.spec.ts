import { expect, test } from "@playwright/test";
import { E2E_USER, cacheCleared } from "./support.ts";

/**
 * The switch on Settings that decides whether anyone else can see the collection, read from where
 * it matters: a signed-out visitor's browser. The page answers 404 to everyone while the profile is
 * private, its owner included (profile.ts), and a setting that says private while the page still
 * answers is the worst failure this app has. Nothing tested the switch at all; cache.spec.ts reads
 * the public page but only ever with the seeded profile left public.
 *
 * Two writes, and the second puts the account back the way the rest of the suite expects it.
 */

test("the public profile follows the Settings switch, off and on", async ({ page, browser }) => {
    const visitor = await (await browser.newContext()).newPage();
    const profile = `/user/${E2E_USER.username}`;

    // The seed leaves the profile public, so the visitor can read it before anything is pressed.
    const open = await visitor.goto(profile);
    expect(open?.status()).toBe(200);
    await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goto("/dashboard/settings");
    const row = page.getByRole("main").getByRole("switch", { name: "Public profile" });
    await expect(row).toBeChecked();

    // setting-switch-row.tsx flips the switch, waits for the write, then forgets the cache quietly
    // and refreshes. The visitor's read below is only true once that forget has answered: the
    // public page is cached under the owner's own tag (public-profile.ts).
    // Space on the focused switch, not a click on it: the kit's Toggle wraps its input in the
    // <label> that carries the words, so the label takes the pointer and the input under it is
    // never reached. A keyboard user flips it exactly this way.
    const closed = cacheCleared(page);
    await row.press("Space");
    await expect(row).not.toBeChecked();
    await closed;

    const shut = await visitor.goto(profile);
    expect(shut?.status()).toBe(404);

    const reopened = cacheCleared(page);
    await row.press("Space");
    await expect(row).toBeChecked();
    await reopened;

    const again = await visitor.goto(profile);
    expect(again?.status()).toBe(200);
    await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();
    await visitor.context().close();
});
