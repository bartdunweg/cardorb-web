import { z } from "zod";

/**
 * A press made by somebody with no account, kept across signing in.
 *
 * A visitor presses the heart on a card and is sent to sign in. The owner's call on 2026-09-22:
 * if you wanted to do something, doing it is the point, and asking again on the far side of a
 * sign-up wastes the one moment the person said yes. So the press is kept here and carried
 * through when the same browser signs in.
 *
 * The cookie is input from a browser, so it is input from a stranger, and everything below is
 * about what may be believed of it:
 * - One press at a time. A newer press replaces an older one, because a queue of parked writes is
 *   something nobody asked for and nobody can see.
 * - Two things it can ask for, and only two: a card to the collection or to the wishlist. It can
 *   never name a binder, a row or another person.
 * - The card is sent to the API as the add a tile makes, which matches it against the catalogues
 *   and refuses a card that is not one. The worst a forged cookie can do is put a real card on the
 *   list of the person signing in, who can take it off in one press.
 * - Thirty minutes. A press older than that is dropped unapplied: a star that appears long after
 *   the press is a surprise, not a service.
 *
 * Not signed with a secret. The one attacker who matters is another site parking a press in a
 * visitor's browser, and that is stopped where the cookie is written (a same-origin POST, see
 * /api/keep-press). The visitor forging their own cookie can only add a card to their own list.
 */

export const KEPT_PRESS_COOKIE = "kept-press";
/** Seconds. The cookie's own life, and the age past which a press is not applied. */
export const KEPT_PRESS_MAX_AGE = 30 * 60;
/** What happened to a kept press, read once by the page signing in lands on. */
export const KEPT_PRESS_DONE_COOKIE = "kept-press-done";

/** The card as a tile adds it (addCard's cardSchema), and nothing a tile does not send. */
const keptCard = z.object({
    name: z.string().trim().min(1).max(120),
    set: z.string().trim().min(1).max(120),
    number: z.string().trim().max(32),
    rarity: z.string().max(80).nullable(),
    types: z.array(z.string().max(32)).max(8).nullable(),
    tcgId: z.string().max(64).nullish(),
    language: z.string().trim().min(2).max(5).nullish(),
});

/** What the page sends when it asks for a press to be kept. */
export const keepPressRequest = z.object({
    target: z.enum(["collection", "wishlist"]),
    card: keptCard,
});
export type KeepPressRequest = z.infer<typeof keepPressRequest>;

/** What the cookie holds: the request, and when the server kept it (not when the browser says). */
const keptPress = keepPressRequest.extend({ at: z.number().int().nonnegative() });
export type KeptPress = z.infer<typeof keptPress>;

/** The cookie's value, written by the server only. */
export function keptPressValue(request: KeepPressRequest, now = Date.now()): string {
    return JSON.stringify({ ...request, at: now });
}

/**
 * The kept press, or null for everything that is not one to apply: no cookie, a value that is
 * not JSON, a shape that is not a press, or a press past its thirty minutes. Null is always
 * silent; a stale or broken cookie is not the visitor's problem to hear about.
 */
export function readKeptPress(raw: string | undefined, now = Date.now()): KeptPress | null {
    if (!raw || raw.length > 2048) return null;
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        return null;
    }
    const parsed = keptPress.safeParse(value);
    if (!parsed.success) return null;
    const age = now - parsed.data.at;
    if (age < 0 || age > KEPT_PRESS_MAX_AGE * 1000) return null;
    return parsed.data;
}

/** What the landing page is told, and the only shape it reads. */
export const keptPressDone = z.object({
    target: z.enum(["collection", "wishlist"]),
    name: z.string().max(120),
    ok: z.boolean(),
});
export type KeptPressDone = z.infer<typeof keptPressDone>;

/** The sentence a kept press ends in, named by the card, so a write the person cannot see happen is still one they are told about. */
export function keptPressSentence({ target, name, ok }: KeptPressDone): string {
    if (!ok) return `${name} could not be added. Press it again to try.`;
    return target === "wishlist" ? `${name} is on your wishlist.` : `${name} is in your collection.`;
}
