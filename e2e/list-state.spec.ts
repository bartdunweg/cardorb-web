import { expect, test } from "@playwright/test";
import { SET_ID, addButton, cacheCleared, card, collectionTile, setTile } from "./support.ts";

const cards = [card(7), card(8), card(9)];

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
    const page = await (await browser.newContext({ storageState: "e2e/.auth/user.json" })).newPage();
    await page.goto(`/sets/${SET_ID}`);
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

/* The term comes back here because it is in the address the browser holds, not because the list
   remembers it: a reload, Back and Forward all replay the address. What the list remembers is the
   test at the bottom of this file, and a term is no part of it. */
test("search, sort and view survive a reload, Back and Forward", async ({ page }) => {
    const [target] = cards;
    await page.goto("/dashboard/cards?sort=set");

    // The field is a plain textbox, not role="searchbox": no field in this app sets type="search"
    // (checked src/components/app/cards-search.tsx and src/components/base/input/input.tsx), so it
    // is matched by its label rather than by role.
    await page.getByLabel("Search in Collection").fill(target.name);
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
        await expect(page.getByLabel("Search in Collection")).toHaveValue(target.name);
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
    await expect(page.getByRole("heading", { level: 1, name: /^(Collection|Home)$/ })).toBeVisible();
});

test("a cleared search stays cleared after a reload, Back and a bare address", async ({ page }) => {
    const [target] = cards;
    await page.goto(`/dashboard/cards?q=${encodeURIComponent(target.name)}`);
    const search = page.getByLabel("Search in Collection");
    await expect(search).toHaveValue(target.name);

    await search.fill("");
    await expect(page).not.toHaveURL(/[?&]q=/);

    const cleared = async () => {
        await expect(page.getByLabel("Search in Collection")).toHaveValue("");
        for (const c of cards) {
            await expect(page.getByRole("main").getByText(c.name, { exact: true }).first()).toBeVisible();
        }
    };

    await page.reload();
    await cleared();

    await page.goto("/dashboard");
    await page.goBack();
    await cleared();

    // What #656 was about, for the field: the bare address shows the whole list with the field
    // empty. The redirect that caused it cannot reach a term any more, because the memory holds
    // none (the test at the bottom of this file); the mechanism itself, a document navigation to a
    // bare address answered from the cookie, is held by the filter version of this test below.
    await page.goto("/dashboard/cards");
    await cleared();
});

// Rarities in hand once beforeAll above has run: card(5) (Cacturne, Uncommon, still owned since
// cache.spec.ts's remove-and-restore) and card(9) (Vivillon, Uncommon) against card(7) and card(8)
// (Scatterbug and Spewpa, both Common). Enough of a spread to prove a rarity chosen in the sheet
// narrows the list and that the choice, not just the search field, survives a reload and Back.

test("a rarity filter chosen in the Filters sheet survives a reload and Back", async ({ page }) => {
    await page.goto("/dashboard/cards");
    await expect(page.getByRole("heading", { name: "Collection", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^Filters/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("row", { name: "Uncommon" }).click();
    await sheet.getByRole("button", { name: /^Show/ }).click();
    await expect(page).toHaveURL(/[?&]rarity=Uncommon/);

    const holds = async () => {
        await expect(page).toHaveURL(/[?&]rarity=Uncommon/);
        await expect(collectionTile(page, card(9))).toBeVisible();
        await expect(collectionTile(page, card(7))).toHaveCount(0);
    };
    await holds();

    await page.reload();
    await holds();

    await page.goto("/dashboard");
    await page.goBack();
    await holds();
});

test("a filter cleared in the Filters sheet stays cleared after a reload, Back and a bare address", async ({ page }) => {
    await page.goto("/dashboard/cards?rarity=Uncommon");
    await expect(collectionTile(page, card(9))).toBeVisible();
    await expect(collectionTile(page, card(7))).toHaveCount(0);

    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page).not.toHaveURL(/[?&]rarity=/);

    const cleared = async () => {
        await expect(collectionTile(page, card(7))).toBeVisible();
        await expect(page).not.toHaveURL(/[?&]rarity=/);
    };
    await cleared();

    await page.reload();
    await cleared();

    await page.goto("/dashboard");
    await page.goBack();
    await cleared();

    // The #656 class, for a filter instead of a search: a document navigation to the bare address
    // (Sec-Fetch-Dest: document) must not be redirected back to the rarity the list-memory cookie
    // still remembers from before it was cleared above.
    await page.goto("/dashboard/cards");
    await cleared();
});

test("the set page keeps its search and tab in its address", async ({ page }) => {
    const [target] = cards;
    await page.goto(`/sets/${SET_ID}`);
    await page.getByLabel("Search in Scarlet & Violet").fill(target.name);
    await page
        .getByRole("tablist", { name: "Cards in this set" })
        .getByRole("tab", { name: /^Owned/ })
        .click();
    await expect(page).toHaveURL(/[?&]holding=owned/);
    await expect(page).toHaveURL(/[?&]q=/);

    await page.reload();
    await expect(page.getByLabel("Search in Scarlet & Violet")).toHaveValue(target.name);
    await expect(page.getByRole("tab", { name: /^Owned/ })).toHaveAttribute("aria-selected", "true");
    await expect(setTile(page, target, "in your collection")).toBeVisible();
});

/* What a list remembers of how it was left, and what it does not (Bart's call, 2026-09-20): the
   filters, the sort, the grouping and the view come back, the search term never does. Before this
   a bare address days later opened on the term last typed, "30th" on Browse, with nothing on
   screen saying where it came from. */
test("a bare address brings the filters back but not the search term", async ({ page }) => {
    await page.goto("/dashboard/cards");
    await expect(page.getByRole("heading", { name: "Collection", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^Filters/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("row", { name: "Uncommon" }).click();
    await sheet.getByRole("button", { name: /^Show/ }).click();
    await expect(page).toHaveURL(/[?&]rarity=Uncommon/);

    await page.getByLabel("Search in Collection").fill(card(9).name);
    await expect(page).toHaveURL(/[?&]q=/);
    await expect(collectionTile(page, card(9))).toBeVisible();

    // Written down after the address changed: the filter is in the cookie, the term is not, so no
    // link the app builds from it (withListQuery) can carry the term either.
    await expect
        .poll(async () => decodeURIComponent((await page.context().cookies()).find((c) => c.name === "list-memory")?.value ?? ""))
        .toContain("rarity=Uncommon");
    const remembered = decodeURIComponent((await page.context().cookies()).find((c) => c.name === "list-memory")?.value ?? "");
    expect(remembered).not.toContain("q=");

    // Away, then the list's bare address typed in again (Sec-Fetch-Dest: document, so openAsLeft answers).
    await page.goto("/dashboard");
    await page.goto("/dashboard/cards");

    await expect(page).toHaveURL(/[?&]rarity=Uncommon/);
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(page.getByLabel("Search in Collection")).toHaveValue("");
    await expect(collectionTile(page, card(9))).toBeVisible();
    await expect(collectionTile(page, card(7))).toHaveCount(0);
});
