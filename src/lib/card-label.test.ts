import { describe, expect, it } from "vitest";
import { cardLabel } from "./card-label";

const card = { set_name: "Destined Rivals", set_abbr: "DRI", number: "230" };

describe("cardLabel", () => {
    it("is the printed code on a small tile, where a set name would truncate", () => {
        expect(cardLabel(card, "sm")).toBe("DRI 230");
        expect(cardLabel(card, "md")).toBe("DRI 230");
    });

    it("is the set's name where there is room for it", () => {
        expect(cardLabel(card, "lg")).toBe("Destined Rivals · #230");
    });

    it("falls back to the name where the catalogue codes no set", () => {
        // One of the 69 sets in a real collection: the Sword & Shield promos.
        expect(cardLabel({ set_name: "SWSH Black Star Promos", set_abbr: null, number: "SWSH282" }, "sm")).toBe("SWSH Black Star Promos · #SWSH282");
    });

    it("leaves out what it does not have", () => {
        expect(cardLabel({ set_name: "Destined Rivals", set_abbr: "DRI", number: null }, "sm")).toBe("DRI");
        expect(cardLabel({ set_name: null, set_abbr: null, number: "12" }, "lg")).toBe("#12");
        expect(cardLabel({}, "sm")).toBe("");
    });
});
