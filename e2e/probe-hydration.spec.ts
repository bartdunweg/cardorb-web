import { expect, test } from "@playwright/test";
import { SET_ID } from "./support.ts";

/* Temporary probe, not for main: why "Search this set" was two inputs for a moment. Records every
   DOM change that leaves more than one such input, the page's errors, and whether the page ends on
   server ids (react-aria-_R_) or on client ids (react-aria<random>-_r_). */
const INIT = () => {
    const w = window as unknown as { __probe: { t0: number; events: string[]; max: number } };
    w.__probe = { t0: performance.now(), events: [], max: 0 };
    const log = (s: string) => w.__probe.events.push(`${Math.round(performance.now())} ${s}`);
    addEventListener("error", (e) => log(`error-event ${e.message} ${(e.error as Error | undefined)?.message ?? ""}`));
    addEventListener("unhandledrejection", (e) => log(`rejection ${String(e.reason)}`));
    const ce = console.error.bind(console);
    console.error = (...a: unknown[]) => {
        log(
            `console.error ${a
                .map((x) => (x instanceof Error ? `${x.message} ${x.stack?.slice(0, 300)}` : String(x)))
                .join(" ")
                .slice(0, 1500)}`,
        );
        ce(...a);
    };
    const re = window.reportError?.bind(window);
    window.reportError = (e: unknown) => {
        log(`reportError ${e instanceof Error ? `${e.message} ${e.stack?.slice(0, 600)}` : String(e)}`);
        re?.(e);
    };
    let last = "";
    const look = () => {
        const inputs = [...document.querySelectorAll("input[aria-label]")].filter((i) => /^Search /.test(i.getAttribute("aria-label") ?? ""));
        const state = inputs.map((i) => `${i.id}${(i as HTMLElement).offsetParent ? "" : "(hidden)"}${i.isConnected ? "" : "(gone)"}`).join(" ");
        w.__probe.max = Math.max(w.__probe.max, inputs.length);
        if (state !== last) {
            last = state;
            log(`inputs ${inputs.length}: ${state} readyState=${document.readyState}`);
        }
    };
    new MutationObserver(look).observe(document, { childList: true, subtree: true });
};

for (const [label, path] of [
    ["Search this set", `/dashboard/sets/${SET_ID}`],
    ["Search your cards", "/dashboard/cards"],
] as const) {
    test(`probe: ${path} loads, one search field or two`, async ({ page }) => {
        test.setTimeout(400_000);
        await page.addInitScript(INIT);
        const lines: string[] = [];
        page.on("pageerror", (e) => lines.push(`pageerror ${e.message}`));
        let doubles = 0;
        let remounts = 0;
        for (let round = 1; round <= 25; round++) {
            await page.goto(path);
            await expect(page.getByRole("textbox", { name: label })).toBeVisible();
            // Up to 4 s for a client-rendered field to replace the server's, which is what the failure showed.
            const remounted = await page
                .waitForFunction((l) => [...document.querySelectorAll(`input[aria-label="${l}"]`)].some((i) => /^react-aria\d+-/.test(i.id)), label, {
                    timeout: 4000,
                })
                .then(() => true)
                .catch(() => false);
            const probe = await page.evaluate(() => (window as unknown as { __probe: { max: number; events: string[] } }).__probe);
            if (remounted) remounts++;
            if (probe.max > 1) doubles++;
            lines.push(`round ${round}: remounted=${remounted} max=${probe.max}\n    ${probe.events.join("\n    ")}`);
        }
        console.log(`${path}: remounts ${remounts}/25, doubles ${doubles}/25\n${lines.join("\n")}`);
    });
}
