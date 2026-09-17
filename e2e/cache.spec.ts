import { expect, test } from "@playwright/test";
import { E2E_USER, SET_ID, addButton, card, collectionTile, removeButton, setTile } from "./support.ts";

const setPage = `/dashboard/sets/${SET_ID}`;

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

    // Leaves the account as this test found it: `stack.spec.ts`'s "a new account opens on Home"
    // expects a fully empty account, and Playwright runs spec files in name order, which puts this
    // file (cache.spec.ts) before stack.spec.ts. An unremoved card here would fail that test.
    await removeButton(page, c).click();
    await expect(page.getByText(`${c.name} is out of your collection`)).toBeVisible();
    await expect(setTile(page, c, "not in your collection")).toBeVisible();
});

test("the public profile shows an added card and loses a removed one", async ({ page, browser }) => {
    const c = card(6);
    const visitor = await (await browser.newContext()).newPage();
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
    const settled = () => page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/api/forget-mine"));

    await page.goto(setPage);
    const added = settled();
    await addButton(page, c).click();
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    await added;
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await visitor.reload();
    await expect(collectionTile(visitor, c)).toHaveCount(1);

    const removed = settled();
    await removeButton(page, c).click();
    await expect(page.getByText(`${c.name} is out of your collection`)).toBeVisible();
    await removed;
    await expect(setTile(page, c, "not in your collection")).toBeVisible();

    await visitor.reload();
    await expect(collectionTile(visitor, c)).toHaveCount(0);
    await visitor.context().close();
});
