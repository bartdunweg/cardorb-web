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
        {
            name: "app",
            testMatch: /\.spec\.ts/,
            dependencies: ["setup"],
            use: { storageState: "e2e/.auth/user.json" },
        },
    ],
});
