import { type Page, expect, test } from "@playwright/test";

/**
 * Five small things a visual sweep measured on 2026-09-18, each read here the way it was found:
 * as a rectangle, a computed style or an animation's own timing function. Read-only throughout:
 * the password is typed and never sent, and every sheet and popover is opened and closed.
 */

const ENTER = "cubic-bezier(0.23, 1, 0.32, 1)";
const DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

type Enter = { tf: string; ty: string; cls: string };

/** Every `enter` animation from here on, with the timing function and the rise it ran with. */
const recordEnters = (page: Page) =>
    page.evaluate(() => {
        const w = window as unknown as { __enters: Enter[] };
        w.__enters = [];
        document.addEventListener(
            "animationstart",
            (e) => {
                if (e.animationName !== "enter" || !(e.target instanceof HTMLElement)) return;
                const cs = getComputedStyle(e.target);
                w.__enters.push({ tf: cs.animationTimingFunction, ty: cs.getPropertyValue("--tw-enter-translate-y").trim(), cls: e.target.className });
            },
            true,
        );
    });
const enters = (page: Page) => page.evaluate(() => (window as unknown as { __enters: Enter[] }).__enters);

test("a long password stops before the show/hide button", async ({ browser }) => {
    // Signed out: the login page is where a password is typed most.
    const visitor = await (await browser.newContext({ viewport: { width: 375, height: 812 }, storageState: { cookies: [], origins: [] } })).newPage();
    await visitor.goto("/login");
    const input = visitor.locator('input[name="password"]');
    await input.fill("a-very-long-password-that-keeps-going-and-going-1234567890");
    const { contentEnd, buttonStart } = await input.evaluate((el) => {
        const button = el.parentElement!.querySelector("button")!;
        return {
            contentEnd: el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight),
            buttonStart: button.getBoundingClientRect().left,
        };
    });
    // Measured before: the text box ran to 345 under a button from 321 to 345.
    expect(contentEnd).toBeLessThanOrEqual(buttonStart);
});

test("a binder tile's icon has a corner concentric with the tile's", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard/collections");
    const icon = page
        .getByRole("main")
        .getByRole("link", { name: /Favorites/ })
        .locator("[data-featured-icon]");
    await expect(icon).toBeVisible();
    const r = await icon.evaluate((el) => {
        const tile = getComputedStyle(el.closest("a")!);
        const layer = getComputedStyle(el, "::before");
        return {
            tile: parseFloat(tile.borderTopLeftRadius),
            pad: parseFloat(tile.paddingTop),
            icon: parseFloat(getComputedStyle(el).borderTopLeftRadius),
            layer: parseFloat(layer.borderTopLeftRadius),
            inset: parseFloat(layer.top),
        };
    });
    // 12 less 16 is nothing, so the smallest rounded square, 8; the icon's own layer inset 4 in it.
    // Measured before: 12 on the icon, 8 on its layer.
    expect(r.icon).toBe(Math.max(r.tile - r.pad, 8));
    expect(r.layer).toBe(r.icon - r.inset);
});

test("You says the name once, under a title of its own", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard/you");
    const main = page.getByRole("main");
    // Measured before: the h1 was the account's name, said again on the card right under it.
    await expect(main.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("You");
    // The card under it still carries who you are and the way to change it.
    await expect(main.getByRole("button", { name: "Manage" })).toBeVisible();
});

test("a settings label starts where its rows' content starts", async ({ page }) => {
    for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/dashboard/settings");
        const label = page.getByRole("main").getByRole("heading", { level: 2, name: "Collection" });
        await expect(label).toBeVisible();
        const { text, content } = await label.evaluate((h) => {
            const range = document.createRange();
            range.selectNodeContents(h);
            return { text: range.getBoundingClientRect().left, content: h.nextElementSibling!.querySelector("svg")!.getBoundingClientRect().left };
        });
        // Measured before: 4 px in from the card, 12 short of the rows' icons.
        expect(Math.abs(text - content)).toBeLessThan(1);
    }
});

test("a phone's bottom sheet rises on the drawer curve, and not at all under reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
        await page.emulateMedia({ reducedMotion });
        await page.goto("/dashboard/you");
        const manage = page.getByRole("main").getByRole("button", { name: "Manage" });
        await expect(manage).toBeVisible();
        await recordEnters(page);
        await manage.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        const sheet = (await enters(page)).find((a) => a.cls.includes("max-sm:slide-in-from-bottom"));
        // Measured before: cubic-bezier(0.23, 1, 0.32, 1), the kit modal's --ease-enter.
        expect(sheet?.tf).toBe(DRAWER);
        if (reducedMotion === "reduce") expect(parseFloat(sheet?.ty ?? "1")).toBe(0);
        else expect(sheet?.ty).toBe("100%");
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
    }
});

test("a popover enters on the enter curve its exit already uses", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/dashboard/design");
    const trigger = page.getByRole("main").locator('[aria-label="Acquired"]').first().getByRole("button").first();
    await trigger.scrollIntoViewIfNeeded();
    await recordEnters(page);
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const popover = (await enters(page)).find((a) => a.cls.includes("origin-(--trigger-anchor-point)"));
    // Measured before: cubic-bezier(0, 0, 0.2, 1), Tailwind's ease-out.
    expect(popover?.tf).toBe(ENTER);
    await page.keyboard.press("Escape");
});
