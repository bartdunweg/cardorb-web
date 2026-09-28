import { expect, test } from "@playwright/test";
import { SET_ID, literal, stranger } from "./support.ts";

/**
 * Sign in and sign up over the page (auth-modal.tsx, Bart 2026-09-28): a link inside the app opens
 * the form in a dialog over the page, the switch between the two keeps the way back, closing lands
 * on the page again, and the same address loaded directly is the full page. Signing in through the
 * dialog, and the dialog being gone after, is kept-press.spec.ts.
 */
test("a visitor's sign-up opens over the page, switches, and closes back onto it", async ({ browser }) => {
    const visitor = await stranger(browser);
    await visitor.goto(`/sets/${SET_ID}`);
    const back = encodeURIComponent(`/sets/${SET_ID}`);

    // The sidebar's plus: making a binder starts with an account.
    await visitor.getByRole("link", { name: "New binder" }).first().click();
    await expect(visitor.getByRole("dialog", { name: "Sign up" })).toBeVisible();
    await expect(visitor).toHaveURL(new RegExp(`/signup\\?next=${literal(back)}$`));
    // The page is still there behind it.
    await expect(visitor.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();

    await visitor.getByRole("dialog").getByRole("link", { name: "Sign in" }).click();
    await expect(visitor.getByRole("dialog", { name: "Sign in" })).toBeVisible();
    await expect(visitor).toHaveURL(new RegExp(`/login\\?next=${literal(back)}$`));

    // One Escape closes it: the switch took the sign-up step's place rather than adding one.
    await visitor.keyboard.press("Escape");
    await expect(visitor.getByRole("dialog")).toHaveCount(0);
    await expect(visitor).toHaveURL(new RegExp(`/sets/${literal(SET_ID)}$`));

    await visitor.context().close();
});

test("the same address loaded directly is the full sign-in page, not a dialog", async ({ browser }) => {
    const visitor = await stranger(browser);
    await visitor.goto("/login");
    // A positive before the zero, so an empty page cannot pass by having nothing.
    await expect(visitor.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
    await expect(visitor.getByRole("dialog")).toHaveCount(0);
    await visitor.context().close();
});
