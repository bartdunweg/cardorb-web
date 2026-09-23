import { expect, test } from "@playwright/test";
import { E2E_USER, SET_ID, addButton, cacheCleared, card, collectionTile, removeButton, setTile, stranger } from "./support.ts";

const setPage = `/sets/${SET_ID}`;

test("after a write, Back and a reload show the new state, not the cached one", async ({ page }) => {
    const c = card(5);
    await page.goto(setPage);
    await expect(setTile(page, c, "not in your collection")).toBeVisible();
    await addButton(page, c).click();
    // The tile flips at once (use-copy-steps.ts presses optimistically), and the toast is the
    // signal the add itself has reached the server, the same wait writes.spec.ts uses before
    // trusting a fresh read. The set page's own per-card cache (perUser, sets.ts) is cleared by
    // POST /api/forget-mine (the set tile passes quiet: true, so use-copy-steps.ts calls
    // forgetMineQuietly() instead of the rereadMine action), which the public profile test below
    // waits on by name because it reloads right after the toast: this test does not, because the
    // goto/assert to /dashboard/cards and the goBack below cost real wall-clock time first, which
    // has given it margin across every run so far. That margin is empirical, not guaranteed.
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);

    await page.goBack();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await page.reload();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    // The remove case: the set tile's minus is the same quiet write (forgetMineQuietly(), POST
    // /api/forget-mine) as the plus above, so it needs the same proof that Back and a reload read
    // past the cache rather than off it. Registered before the click, the way every write in this
    // suite waits for its own cache clear.
    const removed = cacheCleared(page);
    await removeButton(page, c).click();
    await expect(page.getByText(`${c.name} is out of your collection`)).toBeVisible();
    await removed;
    await expect(setTile(page, c, "not in your collection")).toBeVisible();

    // A heading first, not another card: this is the first write of the whole suite, so nothing
    // else is owned yet to prove the list has drawn before the zero count below is trusted.
    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(page.getByRole("heading", { name: "Collection", exact: true })).toBeVisible();
    await expect(collectionTile(page, c)).toHaveCount(0);

    await page.goBack();
    await expect(setTile(page, c, "not in your collection")).toBeVisible();
    await page.reload();
    await expect(setTile(page, c, "not in your collection")).toBeVisible();

    // Restored: the public profile test below, and every spec after this one, counts on card(5)
    // staying owned for the rest of the suite.
    const restored = cacheCleared(page);
    await addButton(page, c).click();
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    await restored;
    await expect(setTile(page, c, "in your collection")).toBeVisible();
});

test("the public profile shows an added card and loses a removed one", async ({ page, browser }) => {
    const c = card(6);
    const visitor = await stranger(browser);
    const profile = `/user/${E2E_USER.username}?q=${encodeURIComponent(c.name)}`;

    await visitor.goto(profile);
    await expect(visitor.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(collectionTile(visitor, c)).toHaveCount(0);

    // The public profile is cached under the owner's publicTag (public-profile.ts), and only a
    // cache-forgetting write clears it (user-cache.ts's forgetMine/forgetMineLater). The set tile
    // presses with quiet: true (set-card-tile.tsx), so use-copy-steps.ts calls forgetMineQuietly()
    // once the row has settled, POST /api/forget-mine, the same call writes.spec.ts's own
    // double-press test already waits for by name. That POST runs after the toast fires in both
    // the add and the remove branch, not before: waiting for the toast alone proves the write
    // landed, not that the cache the visitor reads is empty yet.
    //
    // A first attempt here matched on the rereadMine Server Action instead (the non-quiet sibling
    // call), reasoning from the code without checking a trace; it hung the full 30s timeout, because
    // the set tile never calls that action at all. Read from a CI trace (run 35201215969) that the
    // one write-adjacent POST on this page is /api/forget-mine, matching writes.spec.ts's own
    // finding for the same tile. A visitor briefly seeing the old state during the owner's round
    // trip is fine; reloading before that POST has answered is not, so each step below waits for
    // it by name, not just its toast.
    await page.goto(setPage);
    const added = cacheCleared(page);
    await addButton(page, c).click();
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    await added;
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await visitor.reload();
    await expect(collectionTile(visitor, c)).toHaveCount(1);

    const removed = cacheCleared(page);
    await removeButton(page, c).click();
    await expect(page.getByText(`${c.name} is out of your collection`)).toBeVisible();
    await removed;
    await expect(setTile(page, c, "not in your collection")).toBeVisible();

    // toHaveCount(0) alone cannot tell "drawn and empty of this card" apart from "not drawn yet":
    // this profile is loaded with `?q=` narrowed to card(6) alone, so there is nothing left on it
    // to prove the list actually rendered once c is gone, only that the Suspense fallback might
    // still be showing. card(7) (a list-state.spec.ts card that stays owned) is not owned yet at
    // this point in run order: list-state.spec.ts runs after this file in the "app" project's
    // alphabetical order. card(5), from the test above in this same file, is owned instead: its own
    // cleanup was dropped once playwright.config.ts's explicit "stack" project (task 5's fix) made
    // the account-order dependency it existed for redundant, so it stays owned for the rest of the
    // suite. Loading the unfiltered profile and checking for it first proves the list has drawn
    // before the filtered zero count below is trusted.
    await visitor.goto(`/user/${E2E_USER.username}`);
    await expect(collectionTile(visitor, card(5))).toBeVisible();

    await visitor.goto(profile);
    await expect(collectionTile(visitor, c)).toHaveCount(0);
    await visitor.context().close();
});
