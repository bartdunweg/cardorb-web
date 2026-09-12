import { describe, expect, it } from "vitest";
import { ebaySoldUrl, tcgplayerUrl } from "@/lib/price-links";

const params = (url: string) => new URL(url).searchParams;

describe("ebaySoldUrl", () => {
    const charizard = { name: "Charizard", set_name: "Base Set", number: "4" };

    it("searches sold listings only, in the Pokémon singles category", () => {
        const p = params(ebaySoldUrl(charizard));
        expect(p.get("LH_Sold")).toBe("1");
        expect(p.get("LH_Complete")).toBe("1");
        expect(p.get("_sacat")).toBe("183454");
    });

    // An ungraded copy is what the market price is, so the plain search leaves the slabs out:
    // one PSA 10 sale sits at several times the raw figure and would read as the price.
    it("names the card, its set and its number, and keeps graded slabs out of the plain search", () => {
        expect(params(ebaySoldUrl(charizard)).get("_nkw")).toBe("Charizard Base Set 4 -PSA -BGS -CGC");
    });

    it("asks for PSA 10 sales, and only those, when graded", () => {
        expect(params(ebaySoldUrl(charizard, "psa10")).get("_nkw")).toBe("Charizard Base Set 4 PSA 10");
    });

    it("leaves out what the card does not say rather than searching for null", () => {
        expect(params(ebaySoldUrl({ name: "Pikachu", set_name: null, number: null })).get("_nkw")).toBe("Pikachu -PSA -BGS -CGC");
    });
});

describe("tcgplayerUrl", () => {
    it("opens the product the figure came from, and nothing without one", () => {
        expect(tcgplayerUrl(42382)).toBe("https://www.tcgplayer.com/product/42382");
        expect(tcgplayerUrl(null)).toBeNull();
    });
});
