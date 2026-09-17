import { describe, expect, it } from "vitest";
import { parsePrice } from "./price-input";

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
    });

    it("reads the last mark as the decimal one when both are there", () => {
        expect(parsePrice("1.234,50")).toBe(1234.5);
        expect(parsePrice("1,234.50")).toBe(1234.5);
    });

    it("answers NaN for what is not a price", () => {
        expect(parsePrice("abc")).toBeNaN();
        expect(parsePrice("1,2,3")).toBeNaN();
    });
});
