import { describe, expect, it } from "vitest";
import { kindOf } from "./folder-rule";

describe("kindOf", () => {
    it("reads the kind off the name's suffix", () => {
        expect(kindOf("Beedrill V")).toBe("V");
        expect(kindOf("Venusaur ex")).toBe("ex");
        expect(kindOf("Venusaur EX")).toBe("EX");
        expect(kindOf("Charizard GX")).toBe("GX");
        expect(kindOf("Venusaur & Snivy GX")).toBe("tag-team");
        expect(kindOf("Pikachu VMAX")).toBe("VMAX");
        expect(kindOf("Arceus VSTAR")).toBe("VSTAR");
        expect(kindOf("M Charizard EX")).toBe("mega");
        expect(kindOf("Radiant Charizard")).toBe("radiant");
        expect(kindOf("Greninja BREAK")).toBe("break");
        expect(kindOf("Fomantis")).toBe("regular");
        expect(kindOf("Professor’s Research (Juniper)")).toBe("regular");
    });
});
