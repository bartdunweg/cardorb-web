import { expect, test } from "@playwright/test";
import { E2E_USER, SET_ID, cacheCleared, card, literal, setTile, stranger, wishButton, writesLanded } from "./support.ts";

/**
 * A visitor's press, kept across signing in (kept-press.ts, the owner's call on 2026-09-22).
 *
 * The whole path as a real stranger: the heart on a set tile is a link to sign in, pressing it
 * keeps the press, signing in carries it through, and the page they land on says so by name and
 * shows the card where they put it. Then the wish is taken off again, so the stack is left as found.
 *
 * The card is Dark Tarountula (26), the fixture's last card. No other spec presses it: search.spec
 * only reads its name off a search, and a wish changes no name. The three plain Tarountula (15 to
 * 17) are no use here, because a selector on that name matches all three; "Dark Tarountula" is one.
 */

test("a visitor's heart is kept across signing in and is on the wishlist after", async ({ browser }) => {
    const c = card(26);
    const visitor = await stranger(browser);

    await visitor.goto(`/sets/${SET_ID}`);
    const heart = visitor.getByRole("link", { name: new RegExp(`^Sign in to put ${literal(c.name)} #\\S+ on your wishlist$`) });
    await expect(heart).toBeVisible();

    // The press is kept on the way (keep-press-client.ts) and the link goes where it goes.
    const kept = visitor.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/api/keep-press"));
    await heart.click();
    expect((await kept).status()).toBe(204);
    await expect(visitor).toHaveURL(new RegExp(`/login\\?next=${literal(encodeURIComponent(`/sets/${SET_ID}`))}`));

    // Signing in the way a person does, through the form (auth.setup.ts says why these locators).
    await visitor.getByLabel("Email").fill(E2E_USER.email);
    await visitor.getByRole("textbox", { name: "Password", exact: true }).fill(E2E_USER.password);
    await visitor.getByRole("button", { name: "Sign in" }).click();

    // Back on the page the heart was pressed on, told by name, with the card where they put it.
    await expect(visitor).toHaveURL(new RegExp(`/sets/${literal(SET_ID)}$`));
    await expect(visitor.getByText(`${c.name} is on your wishlist.`, { exact: true })).toBeVisible();
    const unwish = visitor.getByRole("button", { name: new RegExp(`^Remove ${literal(c.name)} #\\S+ from your wishlist$`) });
    await expect(unwish).toBeVisible();
    await expect(setTile(visitor, c, "on your wishlist")).toBeVisible();

    // Taken off again, and read back from the server to be sure it is off there too.
    const cleared = cacheCleared(visitor);
    await unwish.click();
    await expect(visitor.getByText(`${c.name} is off your wishlist`)).toBeVisible();
    await cleared;
    await writesLanded(visitor);

    await visitor.reload();
    // A positive before the zero, so an empty page cannot pass by having nothing.
    await expect(wishButton(visitor, c)).toBeVisible();
    await expect(unwish).toHaveCount(0);
    // The notice was said once: the cookie that carried it is gone.
    await expect(visitor.getByText(`${c.name} is on your wishlist.`, { exact: true })).toHaveCount(0);

    await visitor.context().close();
});
