import { defineConfig, devices } from "@playwright/test";

/* The stack is started by scripts/e2e-stack.sh, not here: it takes a local Supabase and a second
   repo, which is CI's job (docs/superpowers/specs/2026-09-16-e2e-smoke-design.md). */
export default defineConfig({
    testDir: "e2e",
    fullyParallel: false,
    workers: 1,
    retries: 0,
    forbidOnly: !!process.env.CI,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: "http://localhost:3000",
        trace: "retain-on-failure",
        ...devices["Desktop Chrome"],
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        /* stack.spec.ts's "a new account opens on Home" needs a fully empty account. Playwright
           runs spec files in path order inside a project with no explicit testMatch list, which
           would put it after cache.spec.ts and list-state.spec.ts, both of which add cards in
           their own setup. Running it as its own project, before "app", makes that order explicit
           instead of leaning on alphabetical sort surviving whatever a later file is named. */
        {
            name: "stack",
            testMatch: /stack\.spec\.ts/,
            dependencies: ["setup"],
            use: { storageState: "e2e/.auth/user.json" },
        },
        {
            name: "app",
            testMatch: /\.spec\.ts/,
            testIgnore: /stack\.spec\.ts/,
            dependencies: ["stack"],
            use: { storageState: "e2e/.auth/user.json" },
        },
    ],
});
