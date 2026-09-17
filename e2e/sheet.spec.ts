import { type Locator, type Page, expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, collectionTile, literal, setTile } from "./support.ts";

/*
 * The card sheet (card-detail-slideout.tsx with copy-card.tsx), opened from a set tile's picture
 * and from Collection. Cards 12 to 19 of the fixture are this file's, and only the ones with a name
 * of their own: 15, 16 and 17 are all "Tarountula", which every selector here would match three
 * times, so they are left alone.
 *
 * Every write in the sheet forgets nothing itself (reread: false) and ends in forgetMineQuietly(),
 * POST /api/forget-mine, once it has landed: the quantity (showQuantity), a removal (dropCopies), a
 * put back (offerUndo) and an add (add). That response is what a fresh read waits for, registered
 * before the press that causes it, as the set tile's own writes are in writes.spec.ts.
 */

const setPage = `/dashboard/sets/${SET_ID}`;
const collection = (name: string) => `/dashboard/cards?q=${encodeURIComponent(name)}`;

const sprigatito = card(12);
const floragato = card(13);
const meowscarada = card(14);
const spidops = card(18);
const smoliv = card(19);

/** The sheet, named by its heading (react-aria names the dialog from its title slot). */
const sheetOf = (page: Page, name: string): Locator => page.getByRole("dialog", { name });

/** The copies section under the details: "Your copies", an h3 the section is labelled by. */
const copiesOf = (sheet: Locator): Locator => sheet.getByRole("region", { name: "Your copies" });

/*
 * The link at the foot of a copy card. The minus beside the count carries the same name while one
 * copy is left (copy-card.tsx: "Remove this copy" as its aria-label), but it is an icon with no text,
 * so the one with the words is the link.
 */
const removeLink = (sheet: Locator): Locator => sheet.getByRole("button", { name: "Remove this copy" }).filter({ hasText: "Remove this copy" });

const closeSheet = async (sheet: Locator) => {
    await sheet.getByRole("button", { name: "Close", exact: true }).click();
    await expect(sheet).toBeHidden();
};

/** Adds a card from its set tile and waits for the tile's own cache clear (see writes.spec.ts). */
const addFromTile = async (page: Page, c: ReturnType<typeof card>) => {
    const settled = cacheCleared(page);
    await addButton(page, c).click();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await settled;
};

test("one copy more in the sheet shows on the sheet, the tile and Collection, also after a reload", async ({ page }) => {
    const c = sprigatito;
    await page.goto(setPage);
    await addFromTile(page, c);

    await setTile(page, c, "in your collection").click();
    const sheet = sheetOf(page, c.name);
    const more = copiesOf(sheet).getByRole("button", { name: "One copy more" });
    await expect(more).toBeVisible();

    // setCopies (through settleLatest) and then forgetMineQuietly() once it has landed.
    const settled = cacheCleared(page);
    await more.click();
    // Two copies of one kind: the minus becomes "One copy fewer" and the link "Remove all 2".
    await expect(copiesOf(sheet).getByRole("button", { name: "Remove all 2" })).toBeVisible();
    await expect(copiesOf(sheet).getByRole("button", { name: "One copy fewer" })).toBeVisible();
    await settled;

    // Closing flushes the sheet's pending router.refresh(), which draws the tile from the server.
    await closeSheet(sheet);
    await expect(setTile(page, c, "2 copies")).toBeVisible();
    await page.reload();
    await expect(setTile(page, c, "2 copies")).toBeVisible();

    await page.goto(collection(c.name));
    await expect(collectionTile(page, c)).toHaveCount(1);
    await expect(collectionTile(page, c)).toContainText("You hold ×2");
    await page.reload();
    await expect(collectionTile(page, c)).toContainText("You hold ×2");
});

test("a copy removed in the sheet and put back from its toast is held again everywhere", async ({ page }) => {
    const c = floragato;
    await page.goto(setPage);
    await addFromTile(page, c);

    await setTile(page, c, "in your collection").click();
    const sheet = sheetOf(page, c.name);
    await expect(removeLink(sheet)).toBeVisible();

    // dropCopies: removeCard for the row, then forgetMineQuietly() once it has answered.
    const removed = cacheCleared(page);
    await removeLink(sheet).click();
    await expect(copiesOf(sheet).getByText("That was the last copy; it has left your collection.")).toBeVisible();
    await expect(page.getByText("Copy removed")).toBeVisible();
    await removed;

    // offerUndo: restoreCard for the row, then forgetMineQuietly() once it has answered.
    const restored = cacheCleared(page);
    await page.getByRole("button", { name: "Put back" }).click();
    await expect(page.getByText("It is back")).toBeVisible();
    await restored;

    // The toast sits outside the sheet, so the press may count as a press outside it and close it.
    if (await sheet.isVisible()) await closeSheet(sheet);
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await page.reload();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await page.goto(collection(c.name));
    await expect(collectionTile(page, c)).toHaveCount(1);
    await expect(collectionTile(page, c)).toContainText("You hold ×1");
    await page.reload();
    await expect(collectionTile(page, c)).toContainText("You hold ×1");
});

test("a card not held is added from its sheet and then has copies, on the tile and after a reload", async ({ page }) => {
    const c = smoliv;
    await page.goto(setPage);
    await setTile(page, c, "not in your collection").click();
    const sheet = sheetOf(page, c.name);
    await expect(copiesOf(sheet).getByText("You do not hold this card yet.")).toBeVisible();

    // add(): the sheet closes on the press with its toast, then addCard, then forgetMineQuietly().
    const settled = cacheCleared(page);
    await copiesOf(sheet).getByRole("button", { name: "Add to collection" }).click();
    await expect(page.getByText("Added to your collection")).toBeVisible();
    await expect(sheet).toBeHidden();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await settled;

    // Opened again, the sheet is on the new row: its copy, and no offer to take the card.
    await setTile(page, c, "in your collection").click();
    await expect(removeLink(sheet)).toBeVisible();
    await expect(copiesOf(sheet).getByRole("button", { name: "One copy more" })).toBeVisible();
    await expect(copiesOf(sheet).getByRole("button", { name: "Add to collection" })).toHaveCount(0);
    await closeSheet(sheet);

    await page.reload();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await setTile(page, c, "in your collection").click();
    await expect(removeLink(sheet)).toBeVisible();
    await closeSheet(sheet);

    await page.goto(collection(c.name));
    await expect(collectionTile(page, c)).toHaveCount(1);
});

test("a printing chosen in the sheet is the printing the copy is added as", async ({ page }) => {
    // Meowscarada's variants are a reverse and a holo (fixture), so the card route offers both and the
    // sheet opens on the first in the API's FINISHES order, the reverse.
    const c = meowscarada;
    await page.goto(setPage);
    await setTile(page, c, "not in your collection").click();
    const sheet = sheetOf(page, c.name);
    const printings = sheet.getByRole("tablist", { name: "Printing" });
    await expect(printings.getByRole("tab")).toHaveCount(2);

    const opening = (await printings.getByRole("tab", { selected: true }).innerText()).trim();
    const other = printings.getByRole("tab", { selected: false });
    const chosen = (await other.innerText()).trim();
    expect(chosen).not.toBe(opening);
    await other.click();
    await expect(printings.getByRole("tab", { name: chosen })).toHaveAttribute("aria-selected", "true");

    const settled = cacheCleared(page);
    await copiesOf(sheet).getByRole("button", { name: "Add to collection" }).click();
    await expect(page.getByText("Added to your collection")).toBeVisible();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await settled;

    // Collection's tile names the copy's printing under the name (copyLine, in the tab's words).
    await page.goto(collection(c.name));
    await expect(collectionTile(page, c)).toHaveCount(1);
    await expect(collectionTile(page, c)).toContainText(chosen);
    await expect(collectionTile(page, c)).not.toContainText(opening);

    // The set tile has no printing line; its sheet opens on the copy's own printing instead.
    await page.goto(setPage);
    await setTile(page, c, "in your collection").click();
    await expect(sheet.getByRole("tablist", { name: "Printing" }).getByRole("tab", { name: chosen })).toHaveAttribute("aria-selected", "true");
    await expect(removeLink(sheet)).toBeVisible();
});

test("next and previous card in the sheet show each card with its own state", async ({ page }) => {
    // No writes: each card's state is read off its tile first, since other tests in this file hold them.
    const first = floragato;
    const next = meowscarada;
    await page.goto(setPage);

    // Whatever the tile says: held (once or more) or not. No test in this file makes a wish.
    const tileOf = (c: ReturnType<typeof card>) =>
        page.getByRole("button", { name: new RegExp(`^${literal(c.name)} #\\S+, (in your collection|not in your collection|\\d+ copies)$`) });
    const stateOf = async (c: ReturnType<typeof card>) => {
        await expect(tileOf(c)).toBeVisible();
        const label = (await tileOf(c).getAttribute("aria-label")) ?? "";
        return label.endsWith("not in your collection") ? ("missing" as const) : ("owned" as const);
    };
    const firstState = await stateOf(first);
    const nextState = await stateOf(next);

    const showsState = async (sheet: Locator, state: "missing" | "owned") => {
        if (state === "missing") {
            await expect(copiesOf(sheet).getByText("You do not hold this card yet.")).toBeVisible();
            await expect(copiesOf(sheet).getByRole("button", { name: "One copy more" })).toHaveCount(0);
        } else {
            await expect(copiesOf(sheet).getByRole("button", { name: "One copy more" })).toBeVisible();
            await expect(copiesOf(sheet).getByText("You do not hold this card yet.")).toHaveCount(0);
        }
    };

    await tileOf(first).click();
    const firstSheet = sheetOf(page, first.name);
    await expect(firstSheet.getByRole("heading", { name: first.name, exact: true })).toBeVisible();
    await showsState(firstSheet, firstState);

    await firstSheet.getByRole("button", { name: "Next card" }).click();
    const nextSheet = sheetOf(page, next.name);
    await expect(nextSheet.getByRole("heading", { name: next.name, exact: true })).toBeVisible();
    await showsState(nextSheet, nextState);

    await nextSheet.getByRole("button", { name: "Previous card" }).click();
    await expect(firstSheet.getByRole("heading", { name: first.name, exact: true })).toBeVisible();
    await showsState(firstSheet, firstState);
});

test("a sheet opened from Collection is on the owned row with its copies", async ({ page }) => {
    const c = spidops;
    await page.goto(setPage);
    await addFromTile(page, c);

    await page.goto(collection(c.name));
    await expect(collectionTile(page, c)).toHaveCount(1);
    await collectionTile(page, c).click();
    const sheet = sheetOf(page, c.name);

    // The row's own controls: its copy with the count, the star a held card has, and no offer.
    await expect(removeLink(sheet)).toBeVisible();
    await expect(copiesOf(sheet).getByRole("button", { name: "One copy more" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Favorite" })).toBeVisible();
    await expect(copiesOf(sheet).getByText("You do not hold this card yet.")).toHaveCount(0);
    await expect(copiesOf(sheet).getByRole("button", { name: "Add to collection" })).toHaveCount(0);
});
