import { expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, setTile } from "./support.ts";

const cards = [card(7), card(8), card(9)];

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: "e2e/.auth/user.json" })).newPage();
    await page.goto(`/dashboard/sets/${SET_ID}`);
    for (const c of cards) {
        // Registered before the click: the set tile presses with quiet: true, so the write's own
        // cache clear is POST /api/forget-mine (forget-mine.ts's forgetMineQuietly()), the same
        // predicate writes.spec.ts and cache.spec.ts already use for this tile. A reload or a
        // second page reading the list right after beforeAll would otherwise risk a stale cache.
        const settled = cacheCleared(page);
        await addButton(page, c).click();
        await expect(setTile(page, c, "in your collection")).toBeVisible();
        await settled;
    }
    await page.context().close();
});

test("search, sort and view survive a reload, Back and Forward", async ({ page }) => {
    const [target] = cards;
    await page.goto("/dashboard/cards?sort=set");

    // The field is a plain textbox, not role="searchbox": no field in this app sets type="search"
    // (checked src/components/app/cards-search.tsx and src/components/base/input/input.tsx), so it
    // is matched by its label rather than by role.
    await page.getByLabel("Search your cards").fill(target.name);
    await expect(page).toHaveURL(/[?&]q=/);

    await page.getByRole("button", { name: /^Sort/ }).click();
    await page
        .getByRole("menuitemradio", { name: "Name" })
        .or(page.getByRole("menuitem", { name: "Name" }))
        .click();
    await expect(page).toHaveURL(/[?&]sort=name/);

    await page.getByRole("button", { name: /^View/ }).click();
    await page
        .getByRole("menuitemradio", { name: "List" })
        .or(page.getByRole("menuitem", { name: "List" }))
        .click();
    await expect(page.getByRole("grid", { name: "Cards" })).toBeVisible();

    const holds = async () => {
        await expect(page.getByLabel("Search your cards")).toHaveValue(target.name);
        await expect(page).toHaveURL(/[?&]sort=name/);
        await expect(page.getByRole("grid", { name: "Cards" })).toBeVisible();
        await expect(page.getByRole("grid", { name: "Cards" }).getByRole("rowheader", { name: target.name })).toBeVisible();
    };

    await page.reload();
    await holds();

    await page.goto("/dashboard");
    await page.goBack();
    await holds();

    await page.goForward();
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});

test("a cleared search stays cleared after a reload, Back and a bare address", async ({ page }) => {
    const [target] = cards;
    await page.goto(`/dashboard/cards?q=${encodeURIComponent(target.name)}`);
    const search = page.getByLabel("Search your cards");
    await expect(search).toHaveValue(target.name);

    await search.fill("");
    await expect(page).not.toHaveURL(/[?&]q=/);

    const cleared = async () => {
        await expect(page.getByLabel("Search your cards")).toHaveValue("");
        for (const c of cards) {
            await expect(page.getByRole("main").getByText(c.name, { exact: true }).first()).toBeVisible();
        }
    };

    await page.reload();
    await cleared();

    await page.goto("/dashboard");
    await page.goBack();
    await cleared();

    // The regression test for #656 (commit 11eebe6): a document navigation to the bare address
    // (Sec-Fetch-Dest: document, which page.goto sends) must not be redirected back to the term
    // the list-memory cookie still remembers from before it was cleared above. Only a client
    // navigation (Sec-Fetch-Dest: empty) skips that redirect; this goto is a document load, so if
    // openAsLeft ever redirects a typed address again, this assertion fails.
    await page.goto("/dashboard/cards");
    await cleared();
});

test("the set page keeps its search and tab in its address", async ({ page }) => {
    const [target] = cards;
    await page.goto(`/dashboard/sets/${SET_ID}`);
    await page.getByLabel("Search this set").fill(target.name);
    await page
        .getByRole("tablist", { name: "Cards in this set" })
        .getByRole("tab", { name: /^Owned/ })
        .click();
    await expect(page).toHaveURL(/[?&]holding=owned/);
    await expect(page).toHaveURL(/[?&]q=/);

    await page.reload();
    await expect(page.getByLabel("Search this set")).toHaveValue(target.name);
    await expect(page.getByRole("tab", { name: /^Owned/ })).toHaveAttribute("aria-selected", "true");
    await expect(setTile(page, target, "in your collection")).toBeVisible();
});
