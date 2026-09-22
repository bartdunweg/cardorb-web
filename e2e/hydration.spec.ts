import { expect, test } from "@playwright/test";
import { SET_ID } from "./support.ts";

// The set page takes over the drawing the server sent; it does not throw it away and draw the page
// again in the browser.
//
// The set's cards stream in a Suspense boundary that React reveals after the document has finished
// loading. A context value above it that changed while React hydrated made React give up on that
// boundary and render it again from nothing: ThemeProvider read the stored theme with
// useSyncExternalStore (undefined on the server, "system" in the browser) and handed it down in a
// context, so every load where the reveal came after hydration started drew the page twice. For about
// 100 ms both drawings were in the document, the server's still hidden, which is how "the set page
// keeps its search and tab in its address" met two "Search this set" fields (CI run 35232096294).
// Probes of 25 loads each counted 15 such loads before the fix (CI run 35235232184) and none after
// (CI run 35236377634).
//
// Checked on the search field: the element the server drew is kept (an init script notes the first
// one to appear) and is the one that ends up on screen, hydrated. React marks a node it owns with a
// `__reactFiber$` key, which is how "hydrated" is told apart from "still the server's". Ten loads,
// because the reveal wins the race on some loads on its own.
const LABEL = "Search in Scarlet & Violet";

test("the set page hydrates the server's drawing instead of drawing it again", async ({ page }) => {
    await page.addInitScript((label) => {
        const w = window as unknown as { __firstSearch?: Element };
        new MutationObserver(() => {
            w.__firstSearch ??= document.querySelector(`input[aria-label="${label}"]`) ?? undefined;
        }).observe(document, { childList: true, subtree: true });
    }, LABEL);

    for (let load = 1; load <= 10; load++) {
        await page.goto(`/sets/${SET_ID}`);
        const owned = await page.waitForFunction((label) => {
            const shown = [...document.querySelectorAll(`input[aria-label="${label}"]`)].find(
                (i) => !i.closest("[hidden]") && Object.keys(i).some((k) => k.startsWith("__reactFiber$")),
            );
            if (!shown) return undefined;
            const w = window as unknown as { __firstSearch?: Element };
            return { same: shown === w.__firstSearch, fields: document.querySelectorAll(`input[aria-label="${label}"]`).length };
        }, LABEL);
        expect(await owned.jsonValue(), `load ${load}`).toEqual({ same: true, fields: 1 });
    }
});
