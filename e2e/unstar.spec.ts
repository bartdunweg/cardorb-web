import { type Page, expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, collectionTile, literal, setTile } from "./support.ts";

/*
 * A card unstarred on Favorites leaves the list on the press, without a reload.
 *
 * The bug (2026-09-18): the star wrote, the list behind stayed as it was, and the card was still on
 * Favorites until the page was reloaded. The list is read again after such a write, but only at the
 * end of a chain: the write lands, the cached reads are dropped, half a second later the sheet asks
 * the router to refresh, and the render that follows reads the store. Nothing on screen knows
 * anything until that read comes back, and a read answered by a cache that has not caught up is the
 * page from before the write, with nothing to ask again after it.
 *
 * So the read is held here, deliberately: the refresh of /dashboard/favorites is kept in the air
 * until the list has been looked at. Whatever the store says at that moment, the card the reader
 * has just unstarred is not on a list of starred cards; without the fix it is still there. The
 * response is let through afterwards and the reload at the end shows the store agrees.
 *
 * Card 8 (Spewpa) is owned by list-state.spec.ts, which runs before this file; it is added here if
 * it is not, so this spec stands on its own. Two writes: the star on and the star off.
 */

const spewpa = card(8);
const FAVORITES = "/dashboard/favorites";
const favorites = `${FAVORITES}?q=${encodeURIComponent(spewpa.name)}`;
const collection = `/dashboard/cards?q=${encodeURIComponent(spewpa.name)}`;

/** The list's own address, whatever the query on it: the same reference for the route and its undoing. */
const onFavorites = (url: URL) => url.pathname === FAVORITES;

/** The sheet's star, named by the card the sheet is on. */
const starOf = (page: Page) => page.getByRole("dialog", { name: new RegExp(`^${literal(spewpa.name)}`) }).getByRole("button", { name: "Favorite" });

const closeSheet = async (page: Page) => {
    const sheet = page.getByRole("dialog", { name: new RegExp(`^${literal(spewpa.name)}`) });
    await sheet.getByRole("button", { name: "Close", exact: true }).click();
    await expect(sheet).toBeHidden();
};

test("a card unstarred on Favorites leaves the list without a reload", async ({ page }) => {
    await page.goto(`/dashboard/sets/${SET_ID}`);
    if (await addButton(page, spewpa).isVisible()) {
        // Registered before the click: the set tile writes quietly and ends in /api/forget-mine.
        const added = cacheCleared(page);
        await addButton(page, spewpa).click();
        await expect(setTile(page, spewpa, "in your collection")).toBeVisible();
        await added;
    }

    // The star on, from the card's sheet on Collection, and the cache cleared before Favorites is read.
    await page.goto(collection);
    await expect(collectionTile(page, spewpa)).toHaveCount(1);
    await collectionTile(page, spewpa).click();
    await expect(starOf(page)).toBeVisible();
    const starred = cacheCleared(page);
    await starOf(page).click();
    await expect(starOf(page)).toHaveAttribute("aria-pressed", "true");
    await starred;
    await closeSheet(page);

    // The card is on Favorites: what the zero further down is measured against.
    await expect(async () => {
        await page.goto(favorites);
        await expect(collectionTile(page, spewpa)).toHaveCount(1);
    }).toPass({ timeout: 15000 });

    /* Every read of this page held from here on, so nothing the list shows can have come from the
       store since the press: the sheet asks for one when it closes and another half a second after
       the write. A prefetch is let through; it is not this page being read again. */
    let letThrough: () => void = () => {};
    const held = new Promise<void>((resolve) => {
        letThrough = resolve;
    });
    await page.route(onFavorites, async (route) => {
        const request = route.request();
        const headers = request.headers();
        if (request.method() !== "GET" || !headers["rsc"] || headers["next-router-prefetch"]) return route.continue();
        await held;
        await route.continue();
    });

    await collectionTile(page, spewpa).click();
    await expect(starOf(page)).toBeVisible();
    await expect(starOf(page)).toHaveAttribute("aria-pressed", "true");
    const unstarred = cacheCleared(page);
    await starOf(page).click();
    await expect(starOf(page)).toHaveAttribute("aria-pressed", "false");
    // Closed, so the list behind is what a screen reader and these selectors see: a dialog hides it.
    await closeSheet(page);

    // The card is off the list, with no read of the page since the press. The narrowed list says so
    // in its own words, which is drawn only once the list itself has, before any count of nothing.
    await expect(page.getByRole("heading", { name: "No cards found" })).toBeVisible();
    await expect(collectionTile(page, spewpa)).toHaveCount(0);

    letThrough();
    await unstarred;
    await page.unroute(onFavorites);

    // And the store agrees: the card is not on Favorites after a reload either.
    await page.reload();
    await expect(page.getByRole("heading", { name: "No cards found" })).toBeVisible();
    await expect(collectionTile(page, spewpa)).toHaveCount(0);
});
