import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BOOT_SCRIPT, BOOT_SCRIPT_HASH, DARK_CLASS, STORAGE_KEY, SYSTEM_QUERY } from "./theme-script";

describe("BOOT_SCRIPT", () => {
    it("is the script the CSP hash names", () => {
        expect(createHash("sha256").update(BOOT_SCRIPT).digest("base64")).toBe(BOOT_SCRIPT_HASH);
    });

    it("agrees with the provider on the key, the class and the query", () => {
        expect(BOOT_SCRIPT).toContain(JSON.stringify(STORAGE_KEY));
        expect(BOOT_SCRIPT).toContain(JSON.stringify(DARK_CLASS));
        expect(BOOT_SCRIPT).toContain(JSON.stringify(SYSTEM_QUERY));
    });
});
