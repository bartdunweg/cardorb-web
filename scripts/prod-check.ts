/**
 * The production check: what a signed-out visitor and the public API get from cardorb.com right
 * now, run once an hour by .github/workflows/prod-check.yml, which files an issue per failing
 * check (scripts/prod-check-issues.mjs).
 *
 * Read-only by construction. There is no test account, so nothing here signs in, and nothing
 * sends anything but a GET: the pages are opened, the public routes are read, and that is all.
 * One pass is seven API reads and eight page loads; a check that fails is read once more after a
 * pause (a single slow answer is not an outage), so an hour costs the sites at most two passes.
 * Every request names itself in its user agent. None of the routes read is rate limited on the
 * API's side (only /public/{username}/cards/{tcgId} is, at 60 a minute, and it is not read here).
 *
 *   pnpm exec tsx scripts/prod-check.ts   one pass: the report on stdout, the results in prod-check.json
 *   exit 0 every check passed, 1 a check failed, 2 the script itself broke
 *
 * The time budgets are measured, not guessed: see BUDGETS.
 */
import { type Browser, type Response, chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { publicBindersAnswer, publicCardsAnswer, publicProfileAnswer, speciesAnswer } from "@/lib/api-shapes";

const SITE = process.env.PROD_CHECK_SITE ?? "https://cardorb.com";
const API = process.env.PROD_CHECK_API ?? "https://api.cardorb.com/v1";
const OWNER = "bartdunweg";
/** Who is asking, on every request: a name and where to read what it does. */
const AGENT = "CardorbProdCheck/1.0 (+https://github.com/bartdunweg/cardorb-web/blob/main/scripts/prod-check.ts)";
const RETRY_AFTER_MS = 20_000;

/**
 * Time budgets in milliseconds, from measured values plus headroom, never a guess. See MEASURED
 * below for the readings they come from.
 *
 * `document` is the navigation from its start to the last byte of the HTML (responseEnd),
 * `paint` is first contentful paint, `api` is one public route read end to end.
 */
const BUDGETS = {
    static: { document: 1_500, paint: 2_500 },
    rendered: { document: 3_000, paint: 3_500 },
    profile: { document: 5_000, paint: 5_500 },
    api: 2_000,
    apiLarge: 3_000,
} as const;

/**
 * Console errors that are not faults, each with its reason. Anything else fails the page it
 * appeared on. A message that looks like a real fault belongs in an issue, not in this list.
 */
const ALLOWED_CONSOLE: { pattern: RegExp; why: string }[] = [];

type Evidence = { url: string; status?: number; ms?: number; note?: string };
export type CheckResult = { id: string; name: string; ok: boolean; skipped?: string; failures: string[]; evidence: Evidence[]; retried?: boolean };
type Outcome = { skipped?: string; failures: string[]; evidence: Evidence[] };
type Check = { id: string; name: string; run: () => Promise<Outcome> };

// ── The public API ────────────────────────────────────────────────────────────────────────

async function get(url: string): Promise<{ status: number; ms: number; body: unknown }> {
    const started = performance.now();
    const res = await fetch(url, { headers: { "user-agent": AGENT, accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
    const text = await res.text();
    const ms = Math.round(performance.now() - started);
    let body: unknown = text;
    try {
        body = JSON.parse(text);
    } catch {
        // Not JSON: kept as text, and the schema says so.
    }
    return { status: res.status, ms, body };
}

const healthAnswer = z.object({ ok: z.literal(true), database: z.literal("reachable") });

/** What the page checks learn from the API ones: whether the profile is public, and a binder to open. */
const found: { profilePublic: boolean | null; binderId: string | null } = { profilePublic: null, binderId: null };

type ApiOpts<S extends z.ZodType> = { schema?: S; status?: number; budget?: number; then?: (body: z.infer<S>) => string[]; ownerOnly?: boolean };

function apiCheck<S extends z.ZodType>(id: string, name: string, url: string, opts: ApiOpts<S>): Check {
    return {
        id,
        name,
        run: async () => {
            if (opts.ownerOnly && found.profilePublic === false) return { skipped: "the profile is not public", failures: [], evidence: [{ url }] };
            const { status, ms, body } = await get(url);
            const failures: string[] = [];
            const want = opts.status ?? 200;
            if (status !== want) failures.push(`answered ${status}, expected ${want}`);
            else if (opts.schema) {
                const parsed = opts.schema.safeParse(body);
                if (!parsed.success) failures.push(`shape: ${z.prettifyError(parsed.error).split("\n").slice(0, 6).join(" ")}`);
                else failures.push(...(opts.then?.(parsed.data) ?? []));
            }
            const budget = opts.budget ?? BUDGETS.api;
            if (ms > budget) failures.push(`took ${ms} ms, budget ${budget} ms`);
            return { failures, evidence: [{ url, status, ms }] };
        },
    };
}

const apiChecks: Check[] = [
    apiCheck("api-health", "API health", `${API}/health`, { schema: healthAnswer }),
    // bartdunweg.com reads the API through cardorb.com's rewrite (R-DEPLOY-001), so that road is checked too.
    apiCheck("api-rewrite", "API through cardorb.com/api/v1", `${SITE}/api/v1/health`, { schema: healthAnswer }),
    {
        id: "api-profile",
        name: "API public profile",
        run: async () => {
            const url = `${API}/public/${OWNER}/profile`;
            const { status, ms, body } = await get(url);
            // 404 is how the API says "not public": the owner's choice, not an outage. The checks
            // that need a public profile stand down for this run, the profile page among them.
            if (status === 404) {
                found.profilePublic = false;
                return { skipped: "the profile is not public (404)", failures: [], evidence: [{ url, status, ms }] };
            }
            const failures: string[] = [];
            if (status !== 200) failures.push(`answered ${status}, expected 200 (or 404 while the profile is private)`);
            else {
                const parsed = publicProfileAnswer.safeParse(body);
                if (!parsed.success) failures.push(`shape: ${z.prettifyError(parsed.error).split("\n").slice(0, 6).join(" ")}`);
                else if (parsed.data.username !== OWNER) failures.push(`username is ${parsed.data.username}, expected ${OWNER}`);
                else found.profilePublic = true;
            }
            if (ms > BUDGETS.api) failures.push(`took ${ms} ms, budget ${BUDGETS.api} ms`);
            return { failures, evidence: [{ url, status, ms }] };
        },
    },
    apiCheck("api-cards", "API public cards, first page", `${API}/public/${OWNER}/cards?limit=100&offset=0`, {
        schema: publicCardsAnswer,
        budget: BUDGETS.apiLarge,
        ownerOnly: true,
        then: ({ cards, total }) => (total > 0 && cards.length > 0 ? [] : [`an empty first page (total ${total}), and the owner's collection is not empty`]),
    }),
    apiCheck("api-binders", "API public binders", `${API}/public/${OWNER}/folders`, {
        schema: publicBindersAnswer,
        ownerOnly: true,
        then: ({ folders }) => {
            // The cheapest one to open: a binder drawn as a list, not a Pokédex that reads every card.
            found.binderId = (folders.find((f) => !f.pokedex) ?? folders[0])?.id ?? null;
            return [];
        },
    }),
    apiCheck("api-species", "API species list", `${API}/public/species`, {
        schema: speciesAnswer,
        budget: BUDGETS.apiLarge,
        then: ({ entries }) => (entries.length >= 1025 ? [] : [`${entries.length} species, expected 1025`]),
    }),
    // The catalogue index is for signed-in people only; a 200 here would be a door left open.
    apiCheck("api-catalog-private", "API catalogue stays behind sign-in", `${API}/catalog/index`, { status: 401 }),
];

// ── The pages ─────────────────────────────────────────────────────────────────────────────

type PageSpec = {
    id: string;
    name: string;
    path: () => string | null;
    budget: "static" | "rendered" | "profile";
    nonce: boolean;
    pictures?: boolean;
    owner?: boolean;
};

const PAGES: PageSpec[] = [
    { id: "page-landing", name: "Landing page", path: () => "/", budget: "static", nonce: false },
    { id: "page-login", name: "Sign in page", path: () => "/login", budget: "rendered", nonce: true },
    { id: "page-signup", name: "Sign up page", path: () => "/signup", budget: "rendered", nonce: true },
    { id: "page-privacy", name: "Privacy page", path: () => "/privacy", budget: "static", nonce: false },
    { id: "page-terms", name: "Terms page", path: () => "/terms", budget: "static", nonce: false },
    { id: "page-docs", name: "API docs page", path: () => "/docs/api", budget: "static", nonce: false },
    { id: "page-profile", name: "Public profile", path: () => `/user/${OWNER}`, budget: "profile", nonce: true, pictures: true, owner: true },
    {
        id: "page-binder",
        name: "Public binder",
        path: () => (found.binderId ? `/user/${OWNER}?folder=${found.binderId}` : null),
        budget: "profile",
        nonce: true,
        pictures: true,
        owner: true,
    },
];

/** The headers every document keeps: no framing by anyone, and the full script policy where a nonce is minted (src/lib/csp.ts). */
function headerFailures(res: Response, nonce: boolean): string[] {
    const h = res.headers();
    const csp = h["content-security-policy"] ?? "";
    const out: string[] = [];
    if (!csp.includes("frame-ancestors 'none'")) out.push(`CSP lacks frame-ancestors 'none' (content-security-policy: ${csp || "absent"})`);
    if (nonce) {
        if (!/script-src 'nonce-[^']+'/.test(csp)) out.push("CSP lacks a script-src nonce on a per-request page");
        for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'"]) if (!csp.includes(d)) out.push(`CSP lacks ${d}`);
    }
    if ((h["x-frame-options"] ?? "").toUpperCase() !== "DENY") out.push(`x-frame-options is ${h["x-frame-options"] ?? "absent"}, expected DENY`);
    if (!/max-age=\d+/.test(h["strict-transport-security"] ?? "")) out.push("strict-transport-security is absent");
    return out;
}

/** A card picture: our bucket, asked directly or through Vercel's image optimizer. */
const isCardPicture = (src: string) => {
    try {
        return decodeURIComponent(src).includes("://images.cardorb.com/");
    } catch {
        return false;
    }
};

function pageCheck(spec: PageSpec, b: Browser): Check {
    return {
        id: spec.id,
        name: spec.name,
        run: async () => {
            if (spec.owner && found.profilePublic === false) return { skipped: "the profile is not public", failures: [], evidence: [] };
            const path = spec.path();
            if (path === null) return { skipped: "the owner shows no binder", failures: [], evidence: [] };
            const url = `${SITE}${path}`;
            // Chromium's own agent with ours after it, so the site renders as it does for a person and still says who asked.
            const context = await b.newContext({
                userAgent: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${b.version()} Safari/537.36 ${AGENT}`,
            });
            const page = await context.newPage();
            const failures: string[] = [];
            let asked = 0;
            page.on("console", (msg) => {
                if (msg.type() !== "error") return;
                const line = `${msg.text()} (${msg.location().url})`;
                if (!ALLOWED_CONSOLE.some((a) => a.pattern.test(line))) failures.push(`console error: ${line}`);
            });
            page.on("pageerror", (err) => failures.push(`uncaught: ${err.message}`));
            page.on("response", (res) => {
                if (res.request().resourceType() !== "image") return;
                asked += 1;
                if (res.status() >= 400) failures.push(`picture answered ${res.status()}: ${res.url()}`);
            });
            page.on("requestfailed", (req) => {
                if (req.resourceType() === "image") failures.push(`picture failed (${req.failure()?.errorText}): ${req.url()}`);
            });
            try {
                const res = await page.goto(url, { waitUntil: "load", timeout: 30_000 });
                const status = res?.status() ?? 0;
                if (!res || status >= 400) return { failures: [`answered ${status}`, ...failures], evidence: [{ url, status }] };
                failures.push(...headerFailures(res, spec.nonce));
                // The pictures above the fold and whatever streams in late: settled, or ten seconds.
                await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
                if (!(await page.locator("h1").filter({ hasText: /\S/ }).first().isVisible())) failures.push("no level-1 heading with text");
                const seen = await page.evaluate(() => {
                    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
                    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
                    const imgs = [...document.images];
                    return {
                        document: nav ? Math.round(nav.responseEnd - nav.startTime) : null,
                        paint: fcp ? Math.round(fcp.startTime) : null,
                        // complete with no width is a picture that was asked for and did not draw; a lazy one not yet asked is not complete.
                        broken: imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc),
                        drawn: imgs.filter((i) => i.complete && i.naturalWidth > 0).map((i) => i.currentSrc),
                    };
                });
                for (const src of seen.broken) failures.push(`picture did not draw: ${src}`);
                const cards = seen.drawn.filter(isCardPicture).length;
                if (spec.pictures && cards === 0) failures.push(`no card picture from images.cardorb.com drew (${seen.drawn.length} pictures drew in all)`);
                const budget = BUDGETS[spec.budget];
                if (seen.document === null) failures.push("no navigation timing");
                else if (seen.document > budget.document) failures.push(`document took ${seen.document} ms, budget ${budget.document} ms`);
                if (seen.paint === null) failures.push("no first contentful paint");
                else if (seen.paint > budget.paint) failures.push(`first contentful paint at ${seen.paint} ms, budget ${budget.paint} ms`);
                return {
                    failures,
                    evidence: [
                        {
                            url,
                            status,
                            ms: seen.document ?? undefined,
                            note: `paint ${seen.paint ?? "none"} ms, ${seen.drawn.length} pictures drew (${cards} cards), ${asked} asked`,
                        },
                    ],
                };
            } finally {
                await context.close();
            }
        },
    };
}

// ── The run ───────────────────────────────────────────────────────────────────────────────

async function runOne(check: Check): Promise<CheckResult> {
    try {
        const r = await check.run();
        return { id: check.id, name: check.name, ok: r.failures.length === 0, ...r };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { id: check.id, name: check.name, ok: false, failures: [`threw: ${message.split("\n")[0].slice(0, 300)}`], evidence: [] };
    }
}

const cell = (s: string) => s.replaceAll("|", "\\|").replaceAll("\n", " ");

function report(results: CheckResult[], started: Date): string {
    const bad = results.filter((r) => !r.ok).length;
    const lines = [
        `## Production check, ${bad === 0 ? "all passed" : `${bad} failing`}`,
        "",
        `${started.toISOString()}: ${SITE} and ${API}, signed out, read-only.`,
        "",
        "| Check | Result | Evidence |",
        "|---|---|---|",
    ];
    for (const r of results) {
        const result = r.skipped ? `skipped, ${r.skipped}` : r.ok ? "pass" : `**fail**${r.retried ? " (read twice)" : ""}: ${r.failures.join("; ")}`;
        const ev = r.evidence.map((e) =>
            [e.url, e.status, e.ms === undefined ? undefined : `${e.ms} ms`, e.note].filter((x) => x !== undefined && x !== "").join(", "),
        );
        lines.push(`| ${r.name} | ${cell(result)} | ${cell(ev.join("; "))} |`);
    }
    return lines.join("\n");
}

async function main() {
    const started = new Date();
    // Launched before any check, outside them: a browser that will not start is this script broken (exit 2), not eight pages down.
    // PROD_CHECK_CHROMIUM is for a machine whose cached browser is another build than this Playwright's.
    const launched = await chromium.launch({ executablePath: process.env.PROD_CHECK_CHROMIUM || undefined });
    const checks = [...apiChecks, ...PAGES.map((p) => pageCheck(p, launched))];
    const results: CheckResult[] = [];
    // One at a time and in order: the API checks tell the page checks whether the profile is public and which binder to open.
    for (const check of checks) results.push(await runOne(check));
    const failing = results.filter((r) => !r.ok);
    if (failing.length > 0) {
        // One slow or dropped answer is not an outage: what failed is read once more before it counts.
        await new Promise((r) => setTimeout(r, RETRY_AFTER_MS));
        for (const first of failing) {
            const check = checks.find((c) => c.id === first.id);
            if (!check) continue;
            const again = await runOne(check);
            results[results.indexOf(first)] = again.ok
                ? { ...again, evidence: [...again.evidence, { url: "", note: `passed on the second read; the first: ${first.failures.join("; ")}` }] }
                : { ...again, retried: true };
        }
    }
    await launched.close();
    writeFileSync("prod-check.json", JSON.stringify({ started: started.toISOString(), site: SITE, api: API, results }, null, 2));
    console.log(report(results, started));
    process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
