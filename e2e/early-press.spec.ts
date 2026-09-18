import { type Locator, type Page, expect, test } from "@playwright/test";
import { makeBinder } from "./support.ts";

/**
 * A press on a button before the page has hydrated reaches its action once React is in.
 *
 * The server draws every button, so it is on screen and pressable before the page's JavaScript has
 * run. The kit's buttons are react-aria's, whose press handlers are React props: until React has
 * taken the page over, a press on one reached nothing and was simply lost. On a phone that is the
 * first second or two of every page, and it is how "New binder does nothing" reached the owner
 * with no binder made since 2026-09-12. The suite never saw it, because its presses on the page's
 * shell waited for hydration first (a hydrated() helper in support.ts, gone now: nothing needs it).
 *
 * The early press is made certain, not raced: the page's scripts are held back until the button
 * has been pressed, so React cannot have hydrated it (checked on the node itself: React marks a
 * node it owns with a `__reactFiber$` key). Then the scripts go, and the press must land.
 */

/** Holds every script chunk until the returned function is called. */
const holdScripts = async (page: Page): Promise<() => void> => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    await page.route(/\/_next\/static\/.+\.js(\?.*)?$/, async (route) => {
        await gate;
        await route.continue();
    });
    return release;
};

const owned = (target: Locator) => target.evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactFiber$")));

/** Opens `path` with its scripts held, presses `button` and lets the scripts go. */
const pressEarly = async (page: Page, path: string, button: (page: Page) => Locator) => {
    const release = await holdScripts(page);
    await page.goto(path, { waitUntil: "commit" });
    const target = button(page);
    await target.click();
    // The press was made on the server's drawing, before React had the button.
    expect(await owned(target)).toBe(false);
    release();
};

test("New binder beside the title, pressed before hydration, opens the dialog", async ({ page }) => {
    await pressEarly(page, "/dashboard/collections", (p) => p.getByRole("main").getByRole("button", { name: "New binder" }).filter({ visible: true }).first());
    await expect(page.getByRole("dialog", { name: "New binder" })).toBeVisible();
});

test("New binder in the sidebar, pressed before hydration, opens the dialog", async ({ page }) => {
    await pressEarly(page, "/dashboard/collections", (p) => p.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "New binder" }));
    await expect(page.getByRole("dialog", { name: "New binder" })).toBeVisible();
});

test("a binder's menu, pressed before hydration, opens", async ({ page }) => {
    const path = await makeBinder(page, "Binder pressed early");
    await pressEarly(page, path, (p) => p.getByRole("button", { name: "Open menu" }).filter({ visible: true }));
    await expect(page.getByRole("menuitem", { name: "Edit binder" })).toBeVisible();
});

test("Filters, pressed before hydration, opens the sheet", async ({ page }) => {
    await pressEarly(page, "/dashboard/cards", (p) => p.getByRole("button", { name: /^Filters/ }).filter({ visible: true }));
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
});

// The finger goes down on the server's drawing and comes up once React is in. react-aria answers a
// click only after it has seen the pointer go down, so this press was lost as well.
test("New binder, pressed down before hydration and let go after, opens the dialog", async ({ page }) => {
    const release = await holdScripts(page);
    await page.goto("/dashboard/collections", { waitUntil: "commit" });
    const target = page.getByRole("main").getByRole("button", { name: "New binder" }).filter({ visible: true }).first();
    await expect(target).toBeVisible();
    const box = await target.boundingBox();
    if (!box) throw new Error("New binder has no box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    expect(await owned(target)).toBe(false);
    release();
    await expect.poll(() => owned(target), { timeout: 15000 }).toBe(true);
    await page.mouse.up();
    await expect(page.getByRole("dialog", { name: "New binder" })).toBeVisible();
});
