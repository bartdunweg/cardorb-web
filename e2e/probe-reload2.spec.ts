import { expect, test } from "@playwright/test";
import { SET_ID, addButton, addCopyButton, card, literal, setTile } from "./support.ts";

/* Temporary probe, not for main: a reload while the second press's write is in the air. Mode
   "test" reloads as writes.spec.ts does (right after "2 copies" shows); mode "in-flight" waits for
   the second write's request to leave first, so the reload always races it. Node's clock is the
   server's clock here, so these lines sort against the [probe] lines in e2e-web.log. */
for (const mode of ["test", "in-flight"] as const) {
    test(`probe: reload racing the second write, mode ${mode}`, async ({ page }) => {
        test.setTimeout(400_000);
        const c = card(10);
        const setPage = `/dashboard/sets/${SET_ID}`;
        const results: string[] = [];
        const events: string[] = [];
        const log = (s: string) => events.push(`[spec] ${Date.now()} ${s}`);
        page.on("request", (r) => {
            if (r.method() === "POST") log(`req ${r.url().replace("http://localhost:3000", "")} action=${r.headers()["next-action"]?.slice(0, 8) ?? ""}`);
        });
        page.on("requestfinished", (r) => {
            if (r.method() === "POST") log(`done ${r.url().replace("http://localhost:3000", "")}`);
        });
        page.on("requestfailed", (r) => {
            if (r.method() === "POST") log(`FAILED ${r.url().replace("http://localhost:3000", "")} ${r.failure()?.errorText}`);
        });

        const rounds = mode === "test" ? 10 : 6;
        for (let round = 1; round <= rounds; round++) {
            await page.goto(setPage);
            await expect(setTile(page, c, "not in your collection")).toBeVisible();
            log(`round ${round} start`);
            await addButton(page, c).click();
            const second = page.waitForRequest((r) => r.method() === "POST" && Boolean(r.headers()["next-action"]) && /,2,/.test(r.postData() ?? ""), { timeout: 10000 });
            await addCopyButton(page, c).click();
            await expect(setTile(page, c, "2 copies")).toBeVisible();
            if (mode === "in-flight") await second.catch(() => log("no second action request seen"));
            log("reload");
            await page.reload();
            log("reloaded");
            let said = "2 copies";
            try {
                await expect(setTile(page, c, "2 copies")).toBeVisible({ timeout: 5000 });
            } catch {
                const tile = page.getByRole("button", { name: new RegExp(`^${literal(c.name)} #\\S+, `) });
                said = `WRONG: ${await tile
                    .first()
                    .getAttribute("aria-label")
                    .catch(() => "?")}`;
                const htmlState = async () => {
                    const html = await (await page.request.get(setPage)).text();
                    const m = html.match(new RegExp(`${literal(c.name)} #\\S+?, ([a-z0-9 ]+?)"`));
                    return m ? m[1] : "no label in html";
                };
                said += ` | server html now: ${await htmlState()}`;
                const rows = await (await page.request.get(`/api/read/set-rows?set=${encodeURIComponent("Scarlet & Violet")}`)).text();
                const m = rows.match(new RegExp(`"name":"${literal(c.name)}"[^}]*?"quantity":(\\d+)`));
                said += ` | set-rows now: ${m ? `quantity ${m[1]}` : rows.includes(c.name) ? "present" : "absent"}`;
                await page.waitForTimeout(3000);
                said += ` | server html after 3 s: ${await htmlState()}`;
            }
            log(`round ${round} ${said}`);
            results.push(`round ${round}: ${said}`);

            // Reset to none, one remove per copy, each after the store shows the copy.
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
            }).toPass({ timeout: 60000 });
        }
        console.log(results.join("\n"));
        console.log(events.join("\n"));
    });
}
