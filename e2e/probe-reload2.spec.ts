import { expect, test } from "@playwright/test";
import { SET_ID, addButton, addCopyButton, card, literal, setTile } from "./support.ts";

/* Temporary probe, not for main: a reload while the second press's write is in the air, with the
   race widened on purpose by probe-only server delays (x-probe-write-delay holds setCopies before
   its API call, x-probe-read-delay holds the set read after the API answered and before the cache
   stores it). "write-late": the reload's read lands before the write. "read-stored-late": the read
   answers before the write commits but is stored after the write's cache expiry. The question is
   what a fresh read says 3 s later: the store, or a cached answer from before the write. */
for (const [mode, headers] of [
    ["write-late", { "x-probe-write-delay": "600" }],
    ["read-stored-late", { "x-probe-write-delay": "60", "x-probe-read-delay": "700" }],
] as const) {
    test(`probe: reload racing the second write, ${mode}`, async ({ page }) => {
        test.setTimeout(400_000);
        const c = card(10);
        const setPage = `/dashboard/sets/${SET_ID}`;
        const results: string[] = [];
        const log = (s: string) => console.log(`[spec] ${Date.now()} ${s}`);
        page.on("dialog", (d) => {
            log(`dialog ${d.type()}`);
            void d.accept();
        });
        const htmlState = async () => {
            const html = await (await page.request.get(setPage)).text();
            const m = html.match(new RegExp(`${literal(c.name)} #\\S+?, ([a-z0-9 ]+?)"`));
            return m ? m[1] : "no label in html";
        };
        for (let round = 1; round <= 4; round++) {
            await page.setExtraHTTPHeaders({});
            await page.goto(setPage);
            await expect(setTile(page, c, "not in your collection")).toBeVisible();
            log(`${mode} round ${round} start`);
            await addButton(page, c).click();
            await expect(addCopyButton(page, c)).toBeVisible();
            await page.setExtraHTTPHeaders(headers);
            const second = page.waitForRequest((r) => r.method() === "POST" && Boolean(r.headers()["next-action"]) && /,2,/.test(r.postData() ?? ""), {
                timeout: 10000,
            });
            await addCopyButton(page, c).click();
            await second;
            log("reload");
            await page.reload();
            await page.setExtraHTTPHeaders({});
            const tile = page.getByRole("button", { name: new RegExp(`^${literal(c.name)} #\\S+, `) });
            await expect(tile.first()).toBeVisible();
            let said = `tile after reload: ${await tile.first().getAttribute("aria-label")}`;
            await expect(async () => {
                expect(await htmlState()).toBe("2 copies");
            })
                .toPass({ timeout: 3000 })
                .then(() => (said += " | fresh read within 3 s: 2 copies"))
                .catch(async () => (said += ` | fresh read after 3 s: ${await htmlState()}`));
            log(`${mode} round ${round} ${said}`);
            results.push(`${mode} round ${round}: ${said}`);

            await expect(async () => {
                await page.goto(setPage);
                const fewer = page.getByRole("button", { name: new RegExp(`^Remove a copy of ${literal(c.name)} #\\S+$`) });
                const last = page.getByRole("button", { name: new RegExp(`^Remove ${literal(c.name)} #\\S+ from your collection$`) });
                const done = page.waitForResponse((r) => r.url().includes("/api/forget-mine"), { timeout: 5000 });
                done.catch(() => undefined);
                if (await fewer.isVisible()) {
                    await fewer.click();
                    await done;
                } else if (await last.isVisible()) {
                    await last.click();
                    await done;
                }
                await page.goto(setPage);
                await expect(setTile(page, c, "not in your collection")).toBeVisible({ timeout: 2000 });
            }).toPass({ timeout: 90000 });
        }
        console.log(results.join("\n"));
    });
}
