import { describe, expect, it } from "vitest";
import { holoVariant } from "./variant";

describe("holo family for the API's one rarity spelling", () => {
    it("draws Holo Rare LV.X as the LV.X foil it was as Rare Holo LV.X", () => {
        expect(holoVariant("Holo Rare LV.X", null, null).rarity).toBe(holoVariant("Rare Holo LV.X", null, null).rarity);
        expect(holoVariant("Holo Rare LV.X", null, null).rarity).toBe("rare holo v");
    });
});
