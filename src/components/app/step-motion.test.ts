import { describe, expect, it } from "vitest";
import { stepMotion } from "./step-motion";

describe("how a sheet's picture comes in after a step", () => {
    it("fades in place on a key, with no slide", () => {
        expect(stepMotion({ dir: 1, key: true, repeat: false }, false)).toEqual({ travel: 0, duration: "instant" });
        expect(stepMotion({ dir: -1, key: true, repeat: false }, false)).toEqual({ travel: 0, duration: "instant" });
    });

    it("does not animate a held key's repeats", () => {
        expect(stepMotion({ dir: 1, key: true, repeat: true }, false)).toBeNull();
        expect(stepMotion({ dir: -1, key: true, repeat: true }, true)).toBeNull();
    });

    it("slides 12 px from the chevron's side on a press", () => {
        expect(stepMotion({ dir: 1, key: false, repeat: false }, false)).toEqual({ travel: 12, duration: "base" });
        expect(stepMotion({ dir: -1, key: false, repeat: false }, false)).toEqual({ travel: -12, duration: "base" });
    });

    it("keeps only the fade under reduced motion", () => {
        expect(stepMotion({ dir: 1, key: false, repeat: false }, true)).toEqual({ travel: 0, duration: "base" });
        expect(stepMotion({ dir: 1, key: true, repeat: false }, true)).toEqual({ travel: 0, duration: "instant" });
    });

    it("fades in place when the picture changed without a step", () => {
        expect(stepMotion({ dir: 0, key: false, repeat: false }, false)).toEqual({ travel: 0, duration: "base" });
    });
});
