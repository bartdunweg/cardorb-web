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
    // the same deferred rereadMine() the public profile test below waits on explicitly: this test
    // does not wait for it by name because the goto/assert to /dashboard/cards and the goBack
    // below cost real wall-clock time first, which has given it margin across every run so far.
    // That margin is empirical, not guaranteed; the public profile test needed the explicit wait
    // because it reloads right after the toast, with none of that margin.
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

    // The public profile is cached under the owner's publicTag (public-profile.ts), and only
    // rereadMine() clears it (user-cache.ts's forgetMine). The set tile calls addCard and
    // removeCard with reread: false (set-card-tile.tsx), so use-copy-steps.ts defers that clear
    // to its own trailing rereadMine() call, which runs after the toast fires in both the add and
    // the remove branch, not before: waiting for the toast alone proves the write landed, not that
    // the cache the visitor reads is empty yet. CI run 35198515180 failed on the add step this
    // way (the visitor's reload beat rereadMine's own round trip). A visitor briefly seeing the
    // old state during the owner's round trip is fine; reloading before rereadMine's write has
    // landed is not, so each step below waits for that call by name, not just its toast.
    //
    // rereadMine() takes no arguments, so its Server Action body decodes to an empty array; that
    // is what distinguishes it from addCard/removeCard's own call, whose bodies carry their
    // arguments (the same body-shape matching isFavoriteWrite uses in writes.spec.ts, verified
    // there against a real trace).
    const isRereadMine = (body: string | null) => {
        if (!body) return false;
        try {
            const args: unknown = JSON.parse(body);
            return Array.isArray(args) && args.length === 0;
        } catch {
            return false;
        }
    };

    await page.goto(setPage);
    const added = page.waitForResponse((r) => r.request().method() === "POST" && isRereadMine(r.request().postData()));
    await addButton(page, c).click();
    await expect(page.getByText(`${c.name} is in your collection now`)).toBeVisible();
    await added;
    await expect(setTile(page, c, "in your collection")).toBeVisible();

    await visitor.reload();
    await expect(collectionTile(visitor, c)).toHaveCount(1);

    const removed = page.waitForResponse((r) => r.request().method() === "POST" && isRereadMine(r.request().postData()));
    await removeButton(page, c).click();
    await expect(page.getByText(`${c.name} is out of your collection`)).toBeVisible();
    await removed;
    await expect(setTile(page, c, "not in your collection")).toBeVisible();

    await visitor.reload();
    await expect(collectionTile(visitor, c)).toHaveCount(0);
    await visitor.context().close();
});
