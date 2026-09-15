import { describe, expect, it } from "vitest";
import { canonNumber, sameNumber } from "@/lib/card-number";

describe("sameNumber", () => {
    it("reads a number as printed and as a row stores it as one card", () => {
        expect(sameNumber("001", "1")).toBe(true);
        expect(sameNumber("01", "001")).toBe(true);
        expect(sameNumber(" 074 ", "74")).toBe(true);
        expect(sameNumber("100", "10")).toBe(false);
    });

    it("keeps a gallery's letters and a letter after the number", () => {
        expect(sameNumber("TG01", "TG1")).toBe(true);
        expect(sameNumber("TG01", "1")).toBe(false);
        expect(sameNumber("SV49", "49")).toBe(false);
        expect(sameNumber("60a", "60A")).toBe(true);
        expect(sameNumber("60a", "60")).toBe(false);
    });

    it("reads a promo as the number it wraps, as a row stores it", () => {
        expect(sameNumber("SWSH020", "020")).toBe(true);
        expect(sameNumber("SVP085", "85")).toBe(true);
        expect(sameNumber("XY67a", "67A")).toBe(true);
    });

    it("tells two numbers without digits apart", () => {
        expect(canonNumber("?")).toBe("?");
        expect(sameNumber("?", "!")).toBe(false);
        expect(sameNumber(null, "")).toBe(true);
    });
});
