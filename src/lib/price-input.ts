/** What a price field holds: a price (null for an empty field), or why it is not one. */
export type PriceReading = { ok: true; value: number | null } | { ok: false; error: string };

const NOT_A_PRICE = "Enter a price like 12.50.";
const TOO_MANY_DECIMALS = "A price has at most two decimals.";

/** Digits in groups of three after the first, split by `mark`: "1.234.567". */
const grouped = (s: string, mark: string) => new RegExp(`^\\d{1,3}(\\${mark}\\d{3})+$`).test(s);

/**
 * A price as typed into a field.
 *
 * A comma is a decimal separator too, "12,50" as a Dutch keyboard writes it. The field was
 * `type="number"`, which a browser outside a comma locale emptied on a comma, so the price
 * saved as none. With a thousands separator as well, the last of the two marks is the decimal
 * one: "1.234,50" and "1,234.50" are both 1234.5.
 *
 * One mark followed by exactly three digits ("1,234", "1.234") is refused: it is a thousand in
 * one locale and one and a bit in the other, and reading it either way was a thousandfold wrong
 * half the time. More than two decimals is refused too; no price has them.
 */
export function readPrice(text: string): PriceReading {
    const t = text.replace(/\s/g, "");
    if (t === "") return { ok: true, value: null };
    if (!/^[\d.,]+$/.test(t) || !/\d/.test(t)) return { ok: false, error: NOT_A_PRICE };
    const marks = t.replace(/\d/g, "");
    if (marks === "") return { ok: true, value: Number(t) };

    const at = Math.max(t.lastIndexOf("."), t.lastIndexOf(","));
    const last = t[at];
    let whole: string;
    let decimals: string;
    if (new Set(marks).size === 2) {
        // Both marks: the last is the decimal one, and every mark before it groups thousands.
        whole = t.slice(0, at);
        decimals = t.slice(at + 1);
        if (decimals === "" || !grouped(whole, last === "," ? "." : ",")) return { ok: false, error: NOT_A_PRICE };
    } else if (marks.length > 1) {
        // One mark, several times: only thousands groups read that way.
        if (!grouped(t, last)) return { ok: false, error: NOT_A_PRICE };
        whole = t;
        decimals = "";
    } else {
        whole = t.slice(0, at);
        decimals = t.slice(at + 1);
        if (decimals.length === 3 && /^[1-9]\d{0,2}$/.test(whole)) {
            return { ok: false, error: `Is that ${whole}${decimals}? Write it without the mark, or with at most two decimals.` };
        }
    }
    if (decimals.length > 2) return { ok: false, error: TOO_MANY_DECIMALS };
    return { ok: true, value: Number(`${whole.replace(/[.,]/g, "") || "0"}.${decimals || "0"}`) };
}

/** The price in a field: null for an empty field, NaN for something that is not a price. */
export function parsePrice(text: string): number | null {
    const reading = readPrice(text);
    return reading.ok ? reading.value : Number.NaN;
}

/** Why a field's text is not a price, or null when it is one (or is empty). */
export function priceError(text: string): string | null {
    const reading = readPrice(text);
    return reading.ok ? null : reading.error;
}
