import { expect, test } from "@playwright/test";
import { SET_ID, addButton, addCopyButton, cacheCleared, card, literal, setTile } from "./support.ts";

/* Temporary probe, not for main: add, a second copy and an immediate reload, fifteen times on one
   card, with what the tile says after each reload and when the writes answered. Resets the card
   to none after every round. */
test("probe: reload right after two presses, fifteen rounds", async ({ page }) => {
    test.setTimeout(300_000);
    const c = card(10);
    const setPage = `/dashboard/sets/${SET_ID}`;
    const results: string[] = [];
    const events: string[] = [];
    const t0 = Date.now();
    page.on("request", (r) => {
        const u = r.url();
        if (r.method() === "POST" || (r.method() === "GET" && u.endsWith(setPage)))
            events.push(`+${Date.now() - t0} ${r.method()} ${u.replace("http://localhost:3000", "")}${r.headers()["next-action"] ? " action" : ""}`);
    });
    page.on("requestfinished", (r) => {
        const u = r.url();
        if (r.method() === "POST" || (r.method() === "GET" && u.endsWith(setPage)))
            events.push(`-${Date.now() - t0} ${r.method()} ${u.replace("http://localhost:3000", "")}`);
    });
    page.on("dialog", (d) => {
        events.push(`dialog ${d.type()}`);
        void d.accept();
    });

    await page.goto(setPage);
    for (let round = 1; round <= 15; round++) {
        events.push(`round ${round}`);
        await addButton(page, c).click();
        await addCopyButton(page, c).click();
        await expect(setTile(page, c, "2 copies")).toBeVisible();
        events.push(`reload ${Date.now() - t0}`);
        await page.reload();
        const tile = page.getByRole("button", { name: new RegExp(`^${literal(c.name)} #\\S+, `) });
        let said = "";
        try {
            await expect(setTile(page, c, "2 copies")).toBeVisible({ timeout: 5000 });
            said = "2 copies";
        } catch {
            said =
                (await tile
                    .first()
                    .getAttribute("aria-label")
                    .catch(() => null)) ??
                (await tile
                    .first()
                    .innerText()
                    .catch(() => "?"));
            said = `WRONG: ${said}`;
        }
        results.push(`round ${round}: ${said}`);
        events.push(`round ${round} ${said}`);

        // Reset to none: reload until the store's count shows, then step down with the minus.
        await expect(async () => {
            await page.reload();
            await expect(page.getByRole("button", { name: new RegExp(`^${literal(c.name)} #\\S+, (2 copies|in your collection)$`) })).toBeVisible({
                timeout: 2000,
            });
        }).toPass({ timeout: 30000 });
        for (;;) {
            const fewer = page.getByRole("button", { name: new RegExp(`^Remove a copy of ${literal(c.name)} #\\S+$`) });
            const last = page.getByRole("button", { name: new RegExp(`^Remove ${literal(c.name)} #\\S+ from your collection$`) });
            if (await fewer.isVisible()) {
                const done = cacheCleared(page);
                await fewer.click();
                await done;
                continue;
            }
            if (await last.isVisible()) {
                const done = cacheCleared(page);
                await last.click();
                await done;
            }
            break;
        }
        await expect(async () => {
            await page.reload();
            await expect(setTile(page, c, "not in your collection")).toBeVisible({ timeout: 2000 });
        }).toPass({ timeout: 30000 });
    }
    console.log(results.join("\n"));
    console.log(events.join("\n"));
    expect(results.filter((r) => r.includes("WRONG"))).toEqual([]);
});
