import { expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, collectionTile, literal, makeBinder, setTile } from "./support.ts";

/**
 * A binder made, filled, renamed and deleted: the whole life of the thing the sidebar, the Binders
 * page and the card sheet are all built around. Nothing in the suite made a binder before this
 * file, so every one of these presses shipped untested, and a binder is where a collection stops
 * being one long list.
 *
 * One binder per test, named for the test, because the tests share an account and the API refuses a
 * name that is taken. Four writes in the file altogether.
 */

const setPage = `/dashboard/sets/${SET_ID}`;

test("a binder is made, a card goes in it, and the binder is on the card's sheet", async ({ page }) => {
    const name = "Binder with a card";
    const c = card(20);

    // The card first: only a card you hold can be filed, and nothing else in the suite holds this one.
    await page.goto(setPage);
    const added = cacheCleared(page);
    await addButton(page, c).click();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await added;

    const path = await makeBinder(page, name);
    const binderId = path.split("/").pop() ?? "";

    // The plus on a hand-filled binder's page is a menu of two (binder-add-button.tsx): the palette
    // for a card you may not own, and this one for the cards you hold. Filtered to what is on
    // screen, because the page draws the button twice, once for the phone's bar and once beside the
    // title, and only one of the two is shown at any width.
    await page.goto(path);
    await page.getByRole("button", { name: "Add card" }).filter({ visible: true }).click();
    await page.getByRole("menuitem", { name: "From your collection" }).click();

    const picker = page.getByRole("dialog", { name: "Add from your collection" });
    await picker.getByRole("textbox", { name: "Search your cards" }).fill(c.name);
    // The whole row is the box's label, so its accessible name starts with the card's name.
    const hit = picker.getByRole("checkbox", { name: new RegExp(`^${literal(c.name)}\\b`) });
    await expect(hit).toBeVisible();
    await hit.click();
    await expect(hit).toBeChecked();

    // Registered before the press that writes: save() closes the dialog, says so in a toast and
    // writes behind it, then forgetMineThenRefresh("cards") posts /api/forget-mine and only then
    // draws the page the assertions below read (binder-add-button.tsx).
    const filed = cacheCleared(page);
    await picker.getByRole("button", { name: "Add 1 card" }).click();
    await expect(page.getByText(`1 card added to ${name}`)).toBeVisible();
    await filed;

    // In the binder.
    await expect(collectionTile(page, c)).toHaveCount(1);

    // And on the card's own sheet, where the copy says which binder it is in.
    await collectionTile(page, c).click();
    const sheet = page.getByRole("dialog", { name: c.name });
    await expect(sheet.getByRole("combobox", { name: "Binder" })).toHaveValue(binderId);
});

test("a renamed binder carries its new name on its page and in the list", async ({ page }) => {
    const before = "Binder to rename";
    const after = "Binder renamed";
    const path = await makeBinder(page, before);

    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: before })).toBeVisible();

    // The dots on a binder's page: what is done to the binder itself (binder-menu.tsx). Drawn twice
    // like the plus beside it, so again only the one on screen.
    await page.getByRole("button", { name: "Open menu" }).filter({ visible: true }).click();
    await page.getByRole("menuitem", { name: "Edit binder" }).click();

    const dialog = page.getByRole("dialog", { name: "Edit binder" });
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(after);
    // binder-form.tsx's save() waits for the write, then forgets the cache quietly and refreshes:
    // the heading below is drawn from after that, not from the toast.
    const saved = cacheCleared(page);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(`This binder is called ${after} now`)).toBeVisible();
    await saved;

    await expect(page.getByRole("heading", { level: 1, name: after })).toBeVisible();

    await page.goto("/dashboard/collections");
    await expect(page.getByRole("main").getByRole("link", { name: new RegExp(`^${literal(after)}\\b`) })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: new RegExp(`^${literal(before)}\\b`) })).toHaveCount(0);
});

test("a deleted binder is gone from the list", async ({ page }) => {
    const name = "Binder to delete";
    const path = await makeBinder(page, name);

    await page.goto(path);
    await page.getByRole("button", { name: "Open menu" }).filter({ visible: true }).click();
    await page.getByRole("menuitem", { name: "Delete binder" }).click();

    const confirm = page.getByRole("dialog", { name: "Delete this binder?" });
    await confirm.getByRole("button", { name: "Delete", exact: true }).click();
    // deleteBinder() forgets the binders on the server itself and the menu then pushes the list.
    await expect(page).toHaveURL(/\/dashboard\/collections$/);

    // Read again as a fresh page load, not off the push: the router keeps a page it has shown for a
    // minute (next.config.mjs staleTimes), and this list was shown when the binder was made.
    await page.goto("/dashboard/collections");
    // Favorites is the binder that is always there, so its tile proves the list has drawn before
    // the zero count below is trusted.
    await expect(page.getByRole("main").getByRole("link", { name: /^Favorites\b/ })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: new RegExp(`^${literal(name)}\\b`) })).toHaveCount(0);
});
