import { describe, expect, it } from "vitest";
import { FAILED_WRITE_MESSAGE, orFailed } from "./write-outcome";

describe("orFailed", () => {
    it("passes an answer through as it came, a refusal included", async () => {
        await expect(orFailed(Promise.resolve({ ok: true as const, id: "a" }))).resolves.toEqual({ ok: true, id: "a" });
        await expect(orFailed(Promise.resolve({ ok: false as const, error: "No." }))).resolves.toEqual({ ok: false, error: "No." });
    });

    it("answers a write that threw as a refusal", async () => {
        await expect(orFailed(Promise.reject(new Error("fetch failed")))).resolves.toEqual({ ok: false, error: FAILED_WRITE_MESSAGE });
    });
});
