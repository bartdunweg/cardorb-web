import { expect, test } from "@playwright/test";
import { SET_ID, cacheCleared, card, collectionTile, setTile, wishButton } from "./support.ts";

/**
 * A wished card marked as owned. Owned and wished are exclusive (CLAUDE.md), so this is the one
 * press where a card has to leave one list and join the other, and the suite only ever checked the
 * making of a wish, never the settling of one. It is also the only test of the Got it plus, the
 * whole of what a wishlist tile can do.
 *
 * Two writes: the wish, then the card.
 */

test("a wished card marked as owned leaves the wishlist and joins the collection", async ({ page }) => {
    const c = card(21);
    const wishlist = `/dashboard/wishlist?q=${encodeURIComponent(c.name)}`;

    await page.goto(`/sets/${SET_ID}`);
    const wished = cacheCleared(page);
    await wishButton(page, c).click();
    await expect(page.getByText(`${c.name} is on your wishlist now`)).toBeVisible();
    await expect(setTile(page, c, "on your wishlist")).toBeVisible();
    await wished;

    await page.goto(wishlist);
    await expect(collectionTile(page, c)).toHaveCount(1);

    // The plus on the tile itself (got-it-button.tsx): it opens the same form the card sheet opens,
    // so a card that arrived in the post leaves the wishlist without opening the sheet first.
    const owned = cacheCleared(page);
    await page.getByRole("button", { name: `Add ${c.name} to your collection` }).click();
    const form = page.getByRole("dialog", { name: c.name });
    await form.getByRole("button", { name: "Add to collection" }).click();
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    // markOwnedWith writes nothing back itself; forgetMineThenRefresh("cards") posts
    // /api/forget-mine and only then draws the lists the assertions below read.
    await owned;

    // Off the wishlist. The search that finds nothing draws its own heading (binder-body.tsx's
    // noHits), which appears only once the read has resolved, so that is checked before the zero.
    await page.goto(wishlist);
    await expect(page.getByRole("heading", { name: "No cards found" })).toBeVisible();
    await expect(collectionTile(page, c)).toHaveCount(0);

    // And in the collection.
    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);
});
