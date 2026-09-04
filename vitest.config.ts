import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        // Claude Code keeps worktrees of other branches under .claude/ inside the checkout;
        // their tests are theirs to run. Node modules stay excluded as by default.
        exclude: ["**/node_modules/**", ".claude/**"],
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
