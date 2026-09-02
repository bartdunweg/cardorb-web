import { describe, expect, it } from "vitest";
import { formatDate, formatPrice } from "./format";

describe("formatDate", () => {
    it("reads a date-only string as a local day, so it does not slip a day", () => {
        expect(formatDate("2019-02-26")).toBe("Feb 26, 2019");
        expect(formatDate("2019/02/26")).toBe("Feb 26, 2019");
        expect(formatDate(null)).toBe("");
    });
});

describe("formatPrice", () => {
    it("writes euros with two decimals, and nothing for no price", () => {
        expect(formatPrice(12.5)).toBe("€12.50");
        expect(formatPrice(1234)).toBe("€1,234.00");
        expect(formatPrice(0.07)).toBe("€0.07");
        expect(formatPrice(null)).toBe("");
        expect(formatPrice(undefined)).toBe("");
    });
});
