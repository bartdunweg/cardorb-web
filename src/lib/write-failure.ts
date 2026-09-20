import { ApiError } from "@/lib/api";
import { FAILED_WRITE_MESSAGE, type FailedWrite } from "@/lib/write-outcome";

/**
 * What a write that the API refused says on screen.
 *
 * Every action used to hand the API's own sentence straight to a toast, and a session that had
 * ended read "Sign in to see this": the API talking to a reader, in a box with no way to sign in
 * (error-path audit). The words are the app's now, one per kind of refusal, and a 401 is marked
 * so the toast can carry the way back to /login, the same door SessionGuard sends a page to.
 *
 * A 400 and a 409 keep the API's own sentence: those are about what was sent (a copy's finish, a
 * CSV's columns, "That name is taken" from POST /username) and are the refusals that can say
 * something this app does not already know.
 */
const SAID: Record<number, string> = {
    401: "Your session has ended. Sign in and try again.",
    403: "That is not yours to change.",
    404: "That is not there any more. Reload the page.",
    429: "That was a lot of changes at once. Wait a moment and try again.",
};

/** The statuses whose own sentence is the useful one, where the API sent any. */
const OWN_WORDS = new Set([400, 409]);

export function writeFailure(err: unknown): FailedWrite {
    if (!(err instanceof ApiError)) return { ok: false, error: FAILED_WRITE_MESSAGE };
    if (err.status === 401) return { ok: false, error: SAID[401], signedOut: true };
    const said = SAID[err.status];
    if (said) return { ok: false, error: said };
    if (OWN_WORDS.has(err.status) && err.message) return { ok: false, error: err.message };
    // A 5xx, or anything else the API answers: the API, not the person, and nothing to act on.
    return { ok: false, error: FAILED_WRITE_MESSAGE };
}
