import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { writeFailure } from "@/lib/write-failure";
import { FAILED_WRITE_MESSAGE } from "@/lib/write-outcome";

/*
 * A write refused by the API used to hand its own sentence to a toast, so a session that had run
 * out said "Sign in to see this" with nothing to press (error-path audit). The words are the
 * app's now, and the one refusal a person can act on is marked so the toast can carry the door.
 */
describe("what a refused write says", () => {
    it("names the ended session and marks it, so the toast can offer Sign in", () => {
        const said = writeFailure(new ApiError(401, "Sign in to see this"));
        expect(said).toEqual({ ok: false, error: "Your session has ended. Sign in and try again.", signedOut: true });
        expect(said.error).not.toMatch(/Sign in to see this/);
    });

    it("speaks the app's words for the other refusals, and marks none of them", () => {
        for (const status of [403, 404, 409, 429]) {
            const said = writeFailure(new ApiError(status, "raw api words"));
            expect(said.error).not.toBe("raw api words");
            expect(said.signedOut).toBeUndefined();
        }
    });

    it("keeps a 400's own sentence, the one refusal that is about what was sent", () => {
        expect(writeFailure(new ApiError(400, "That finish is not one of this card's."))).toEqual({
            ok: false,
            error: "That finish is not one of this card's.",
        });
    });

    it("falls back to the one message for a service that broke or never answered", () => {
        expect(writeFailure(new ApiError(500, "upstream exploded")).error).toBe(FAILED_WRITE_MESSAGE);
        expect(writeFailure(new TypeError("offline")).error).toBe(FAILED_WRITE_MESSAGE);
    });
});
