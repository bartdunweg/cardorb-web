import { describe, expect, it } from "vitest";
import { formatCount, formatDate, formatPercent, formatPrice } from "./format";

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

describe("formatPercent", () => {
    it("writes a ratio as a whole percent", () => {
        expect(formatPercent(0.05)).toBe("5%");
        expect(formatPercent(0.125)).toBe("13%");
        expect(formatPercent(1.5)).toBe("150%");
    });
});

describe("formatCount", () => {
    it("groups thousands, so a count reads the same wherever the app says it", () => {
        expect(formatCount(1025)).toBe("1,025");
        expect(formatCount(0)).toBe("0");
        expect(formatCount(999)).toBe("999");
        expect(formatCount(1234567)).toBe("1,234,567");
    });
});
