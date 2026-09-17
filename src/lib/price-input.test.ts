import { describe, expect, it } from "vitest";
import { parsePrice, priceError, readPrice } from "./price-input";

describe("parsePrice", () => {
    it("reads an empty field as no price", () => {
        expect(parsePrice("")).toBeNull();
        expect(parsePrice("  ")).toBeNull();
    });

    it("takes a point or a comma as the decimal mark", () => {
        expect(parsePrice("12.50")).toBe(12.5);
        expect(parsePrice("12,50")).toBe(12.5);
        expect(parsePrice(",5")).toBe(0.5);
        expect(parsePrice("7")).toBe(7);
        expect(parsePrice("12.")).toBe(12);
        expect(parsePrice("1 234,5")).toBe(1234.5);
    });

    it("reads the last mark as the decimal one when both are there", () => {
        expect(parsePrice("1.234,50")).toBe(1234.5);
        expect(parsePrice("1,234.50")).toBe(1234.5);
        expect(parsePrice("12.345.678,9")).toBe(12345678.9);
    });

    it("reads one mark repeated in groups of three as thousands", () => {
        expect(parsePrice("1,234,567")).toBe(1234567);
        expect(parsePrice("1.234.567")).toBe(1234567);
    });

    it("refuses one mark before exactly three digits, a thousand or one and a bit", () => {
        expect(parsePrice("1,234")).toBeNaN();
        expect(parsePrice("1.234")).toBeNaN();
        expect(parsePrice("123,456")).toBeNaN();
        expect(priceError("1,234")).toMatch(/1234/);
    });

    it("refuses more than two decimals", () => {
        expect(parsePrice("0.123")).toBeNaN();
        expect(parsePrice("1234.567")).toBeNaN();
        expect(parsePrice("1,234.567")).toBeNaN();
        expect(priceError("0.123")).toBe("A price has at most two decimals.");
    });

    it("answers NaN, with a reason, for what is not a price", () => {
        for (const text of ["abc", "1,2,3", "12,5,0", "-5", "1e3", ".", "1.234,", "1,23.4,5"]) {
            expect(parsePrice(text), text).toBeNaN();
            expect(readPrice(text).ok, text).toBe(false);
        }
        expect(priceError("abc")).toBe("Enter a price like 12.50.");
        expect(priceError("12,50")).toBeNull();
        expect(priceError("")).toBeNull();
    });
});
