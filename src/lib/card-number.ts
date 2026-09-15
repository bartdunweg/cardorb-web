/**
 * A card number folded down to what it means rather than how it is spelt.
 *
 * The API's catalogue writes a number as the card prints it ("001" for Sword & Shield, "SWSH020" for a
 * promo) and a collection row keeps what it was added with ("1", "020"), so a comparison of the two
 * has to read past the spelling. This is cardorb-api's canonNumber (src/lib/core/card-number.mjs), the
 * rule its own copy sheet filter and set pages match by: the digits without their padding, in any case,
 * without a promo set's letters, and every other letter in its place, so TG01 is not card 1 and 60a is
 * not 60. A number with no digits (Unown "?") is itself, in any case.
 */
const PROMO_PREFIX = /^(?:HGSS|SWSH|SVP|XY|SM|BW|DP)(?=\d)/i;

export function canonNumber(n: string | null | undefined): string {
    const trimmed = (n ?? "").trim();
    const m = /^([A-Za-z]*)0*(\d+)(.*)$/.exec(trimmed.replace(PROMO_PREFIX, ""));
    if (m) return `${m[1] ?? ""}${Number(m[2])}${m[3] ?? ""}`.toLowerCase();
    return trimmed.toLowerCase();
}

/** Whether two numbers of one set name the same card, whichever way each is spelt. */
export const sameNumber = (a: string | null | undefined, b: string | null | undefined) => canonNumber(a) === canonNumber(b);
