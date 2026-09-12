import { describe, expect, it } from "vitest";
import { tcgplayerUrl } from "@/lib/price-links";

describe("tcgplayerUrl", () => {
    it("opens the product the figure came from, and nothing without one", () => {
        expect(tcgplayerUrl(42382)).toBe("https://www.tcgplayer.com/product/42382");
        expect(tcgplayerUrl(null)).toBeNull();
    });
});
