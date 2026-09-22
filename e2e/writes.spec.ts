import { expect, test } from "@playwright/test";
import {
    SET_ID,
    addButton,
    addCopyButton,
    cacheCleared,
    card,
    collectionTile,
    ownedCount,
    removeButton,
    setTile,
    wishButton,
    writesLanded,
} from "./support.ts";

const setPage = `/sets/${SET_ID}`;

test("adding a card shows on the tile, on Collection and on Home, before and after a reload", async ({ page }) => {
    const c = card(0);
    const before = await ownedCount(page);

    await page.goto(setPage);
    // Registered before the click: the set tile presses with quiet: true, so the add's own cache
    // clear is /api/forget-mine (forget-mine.ts's forgetMineQuietly()), which the reload below
    // depends on having landed, not just the toast.
    const settled = cacheCleared(page);
    await addButton(page, c).click();
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await settled;

    await page.reload();
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);

    expect(await ownedCount(page)).toBe(before + 1);
});

test("two quick presses on plus make two copies, not one and not three", async ({ page }) => {
    const c = card(1);
    await page.goto(setPage);
    // Two presses a person makes: the add button, then the "Add a copy of" button that replaces
    // it once the tile redraws. use-copy-steps.ts reads press(quantity) off the tile's last
    // render, so two synthetic clicks under one frame apart both call press(1) before React
    // redraws and count once; a person's two presses are never that close together, so clicking
    // the button the redraw actually shows is what makes this test press the way a person does.
    //
    // The tile shows the count under the finger and the store follows behind, one write at a
    // time, with a toast on the first copy only (use-copy-steps.ts): a second press that only
    // changes the quantity says nothing back. A reload right after the press can land before the
    // two chained writes (add, then the count) have reached the server, and read one copy back
    // instead of two, so the reload waits for `writesLanded`: the page's own mark that every press
    // is written and its cache forgotten. Not the first /api/forget-mine answer: when the second
    // press comes after the first write's run has ended, that answer belongs to the first press
    // alone, and the second write was still in the air when the reload went (CI run 35232096294:
    // forget-mine answered at +0 ms, the count's write left at +76 ms, the reload at +102 ms
    // aborted it). (Not networkidle: Speed Insights keeps its own traffic going.)
    //
    // This caught a real bug (CI run 35196214137): the reload read "not in your collection" about
    // one round in three. /api/revalidate, called by the API after every write, expired the cache
    // with "max" and so undid the immediate expiry /api/forget-mine had just set; fixed in web#676.
    await addButton(page, c).click();
    await addCopyButton(page, c).click();

    await expect(setTile(page, c, "2 copies")).toBeVisible();
    await writesLanded(page);
    await page.reload();
    await expect(setTile(page, c, "2 copies")).toBeVisible();

    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);
});

// The #521 guard (presses making extra rows) while both double-press tests are fixme for the reload bug.
// No reload of the set page here, since that is where the open bug shows. The store is read on
// a fresh page in the same context instead, only once /api/forget-mine has answered: that call
// goes out after both writes have landed (use-copy-steps.ts). The collection tile shows the held
// count as a screen-reader "You hold " before "×2" (cards-grid.tsx), so its text is checked for
// exactly that, and a single tile rules out a second row.
test("two presses make exactly two copies", async ({ page }) => {
    const c = card(11);
    await page.goto(setPage);
    const settled = cacheCleared(page);
    await addButton(page, c).click();
    await addCopyButton(page, c).click();

    await expect(setTile(page, c, "2 copies")).toBeVisible();
    await settled;
    await expect(setTile(page, c, "3 copies")).toHaveCount(0);

    // use-copy-steps.ts's outer loop can send /api/forget-mine a second time if a press lands
    // while the first call is in flight (the do/while re-checks want.current !== have after the
    // await); `settled` above only resolves on the first such call, so a fresh page's read is
    // retried until it settles rather than trusted on the first try.
    const other = await page.context().newPage();
    await expect(async () => {
        await other.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
        await expect(collectionTile(other, c)).toHaveCount(1);
        await expect(collectionTile(other, c)).toContainText("You hold ×2");
    }).toPass({ timeout: 15000 });
    await other.close();
});

// A reload the moment two presses have landed. It read "not in your collection" about one round in
// three (CI run 35195242573) until web#676: /api/revalidate's "max" turned the cache's immediate
// expiry into stale-while-revalidate, so the reload was drawn from before the writes.
//
// The moment they have landed, not before. This reload used to race the writes still in the air:
// in the failing runs the count's write left 20 to 30 ms before the reload, which aborted it, and
// the reloaded page was read before that write reached the store (CI runs 35232851434 and
// 35234584489, both one copy). That is not a promise the app makes: while a press is unsent the
// page asks "Leave site?" (web#673), and a person who stays sees both copies after the reload,
// which is what this checks. Playwright answers that question with Leave on its own.
//
// Two presses a person makes: the add button, then the "Add a copy of" button that replaces it
// once the tile redraws, each click after the previous one's redraw. This is deliberate, not an
// oversight: use-copy-steps.ts reads press(quantity) off the tile's last render, so two synthetic
// clicks less than one frame apart both call press(1) before React redraws and count once. A
// person's two presses are never that close together, so a sub-frame double click is not the bug
// this test is for.
test("a reload right after two presses keeps both copies", async ({ page }) => {
    const c = card(10);
    await page.goto(setPage);
    await addButton(page, c).click();
    await addCopyButton(page, c).click();

    await expect(setTile(page, c, "2 copies")).toBeVisible();
    await writesLanded(page);
    await page.reload();
    await expect(setTile(page, c, "2 copies")).toBeVisible();
});

test("removing a card and putting it back leaves it in the collection everywhere", async ({ page }) => {
    const c = card(2);
    await page.goto(setPage);
    await addButton(page, c).click();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    // The add's toast first. It comes in at the top of the window a moment after the press, and in
    // CI run 35234584489 it came in over this tile's minus (the page stood scrolled with the tile
    // at the top) just as the minus was pressed: the toast took the press, no removal was sent,
    // and the tile stayed at one. With the toast already there, Playwright sees it cover the
    // button and waits until it does not, as a person would.
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();

    await removeButton(page, c).click();
    await expect(page.getByText(`${c.name} is out of your collection`)).toBeVisible();
    await expect(setTile(page, c, "not in your collection")).toBeVisible();

    // "Put back" on a set tile (quiet) calls restoreCard(removed, { reread: false }) and then
    // /api/forget-mine and a refresh (use-copy-steps.ts putBack). The reload below needs only the
    // restore itself: the API expires this person's cached reads through /api/revalidate before it
    // answers the write. There is no toast for this write and the tile's own state flips
    // optimistically, same as every other write here. The
    // POST is restoreCard's own Server Action call, matched by its argument shape (a single object
    // with the removed card's fields) rather than by URL, since every write on this page posts to
    // the same set page address with a next-action header.
    const isRestoreWrite = (body: string | null) => {
        if (!body) return false;
        try {
            const args: unknown = JSON.parse(body);
            const first: unknown = Array.isArray(args) ? args[0] : undefined;
            return (
                typeof first === "object" &&
                first !== null &&
                "setName" in first &&
                "owned" in first &&
                typeof (first as { owned: unknown }).owned === "boolean"
            );
        } catch {
            return false;
        }
    };
    const restored = page.waitForResponse((r) => r.request().method() === "POST" && isRestoreWrite(r.request().postData()) && r.ok());
    await page.getByRole("button", { name: "Put back" }).click();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await restored;

    await page.reload();
    await expect(setTile(page, c, "in your collection")).toBeVisible();
    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);
});

test("the star and the Favorites list agree, on and off", async ({ page }) => {
    const c = card(3);
    await page.goto(setPage);
    await addButton(page, c).click();
    await setTile(page, c, "in your collection").click();

    const sheet = page.getByRole("dialog", { name: c.name });
    const star = sheet.getByRole("button", { name: "Favorite" });
    // The star answers under the finger and writes behind it, with no toast to say the write has
    // landed (card-detail-slideout.tsx: "no spinner, because a favourite is a mark and not a task
    // to wait for"). A page read right after the click can only be trusted once that write's own
    // response is back, or it reads the server as it was before the press.
    //
    // "Any POST" is not specific enough to trust, so this matches the write's own shape instead.
    // The sheet opening its own reads (facts, prices, binders, facets) turned out not to be the
    // risk here: read from a CI trace (2026-09-17), those all go out as GET requests to
    // /api/read/*, never a POST. What a captured trace did show is that setFavorite's own Server
    // Action body is a JSON array whose first element is the card's id (a string) and second is
    // the pressed value (a boolean) verbatim, in that position, for both the star-on and the
    // star-off press; that pair is exactly what `setFavorite(cardId, isFavorite)` is called with
    // (card-detail-slideout.tsx toggleStar) and it is the only action in
    // src/app/(app)/dashboard/cards/actions.ts or collections/actions.ts whose declared
    // parameters are (string, boolean) with nothing else that fits before them (checked
    // 2026-09-17). Server Actions send their arguments as a plain JSON array with no field names,
    // so matching on the literal text "isFavorite" would never fire; matching the argument shape
    // is what actually picks this write out.
    const isFavoriteWrite = (body: string | null) => {
        if (!body) return false;
        try {
            const args: unknown = JSON.parse(body);
            return Array.isArray(args) && args.length >= 2 && typeof args[0] === "string" && typeof args[1] === "boolean";
        } catch {
            return false;
        }
    };
    const starWrite = page.waitForResponse((r) => r.request().method() === "POST" && isFavoriteWrite(r.request().postData()) && r.ok());
    await star.click();
    await expect(star).toHaveAttribute("aria-pressed", "true");
    await starWrite;

    await page.goto(`/dashboard/favorites?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);

    await collectionTile(page, c).click();
    const again = page.getByRole("dialog", { name: c.name }).getByRole("button", { name: "Favorite" });
    await expect(again).toHaveAttribute("aria-pressed", "true");
    const unstarWrite = page.waitForResponse((r) => r.request().method() === "POST" && isFavoriteWrite(r.request().postData()) && r.ok());
    await again.click();
    await expect(again).toHaveAttribute("aria-pressed", "false");
    await unstarWrite;

    await page.reload();
    // toHaveCount(0) alone would pass just as well while the list's Suspense fallback is still
    // showing, before it has drawn at all; the search that finds nothing renders its own "No cards
    // found" heading (binder-body.tsx's noHits), which only appears once the read has actually
    // resolved, so that is checked first.
    await expect(page.getByRole("heading", { name: "No cards found" })).toBeVisible();
    await expect(collectionTile(page, c)).toHaveCount(0);
});

test("a wished card is on the wishlist and not in the collection", async ({ page }) => {
    const c = card(4);
    const before = await ownedCount(page);
    await page.goto(setPage);
    await wishButton(page, c).click();
    await expect(page.getByText(`${c.name} is on your wishlist now`)).toBeVisible();
    await expect(setTile(page, c, "on your wishlist")).toBeVisible();

    await page.goto(`/dashboard/wishlist?q=${encodeURIComponent(c.name)}`);
    await expect(collectionTile(page, c)).toHaveCount(1);
    await page.goto(`/dashboard/cards?q=${encodeURIComponent(c.name)}`);
    // Same reasoning as the star test above: the search-finds-nothing heading proves the list has
    // drawn before the zero count is trusted.
    await expect(page.getByRole("heading", { name: "No cards found" })).toBeVisible();
    await expect(collectionTile(page, c)).toHaveCount(0);
    expect(await ownedCount(page)).toBe(before);
});
