/** What a write that never answered says: the same words as an action that caught its own throw. */
export const FAILED_WRITE_MESSAGE = "Something went wrong. Try again.";

/**
 * A write's refusal, in the shape every action answers with. `signedOut` is the one refusal a
 * screen can do something about: the toast then offers the way to /login (write-failure.ts).
 */
export type FailedWrite = { ok: false; error: string; signedOut?: boolean };

/**
 * An action's answer, or a refusal when the call itself threw (no signal, a deploy in between).
 *
 * A write that throws must read like one that said no: the form keeps what was typed, a button
 * stops spinning, a mark shown ahead of the store is taken back. Every caller wrote the same
 * `.catch(() => ({ ok: false as const, error: "..." }))`; this is that, once.
 */
export function orFailed<T>(write: Promise<T>): Promise<T | FailedWrite> {
    return write.catch((): FailedWrite => ({ ok: false, error: FAILED_WRITE_MESSAGE }));
}
