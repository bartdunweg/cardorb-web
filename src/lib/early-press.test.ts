import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EARLY_PRESS_SCRIPT, EARLY_PRESS_SCRIPT_HASH, REPLAY_FUNCTION, WAITING_ATTRIBUTE } from "./early-press";

describe("EARLY_PRESS_SCRIPT", () => {
    it("is the script the CSP hash names", () => {
        expect(createHash("sha256").update(EARLY_PRESS_SCRIPT).digest("base64")).toBe(EARLY_PRESS_SCRIPT_HASH);
    });

    it("agrees with the page on the waiting mark and the replay call", () => {
        expect(EARLY_PRESS_SCRIPT).toContain(JSON.stringify(WAITING_ATTRIBUTE));
        expect(EARLY_PRESS_SCRIPT).toContain(`w.${REPLAY_FUNCTION}=`);
    });
});
