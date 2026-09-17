/**
 * A price as typed into a field: null for an empty field, NaN for something that is not a price.
 *
 * A comma is a decimal separator too, "12,50" as a Dutch keyboard writes it. The field was
 * `type="number"`, which a browser outside a comma locale emptied on a comma, so the price
 * saved as none. With a thousands separator as well, the last of the two marks is the decimal
 * one: "1.234,50" and "1,234.50" are both 1234.5.
 */
export function parsePrice(text: string): number | null {
    const t = text.trim().replace(/\s/g, "");
    if (t === "") return null;
    if (/^\d{1,3}(\.\d{3})+,\d+$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
    if (/^\d{1,3}(,\d{3})+\.\d+$/.test(t)) return Number(t.replace(/,/g, ""));
    if (/^\d*,\d+$/.test(t)) return Number(t.replace(",", "."));
    return Number(t);
}
