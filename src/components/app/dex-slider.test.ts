import { afterEach, describe, expect, it, vi } from "vitest";
import { pageBehavior } from "./dex-slider";

const reduced = (matches: boolean) => vi.stubGlobal("matchMedia", (query: string) => ({ matches: matches && query === "(prefers-reduced-motion: reduce)" }));

describe("pageBehavior", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("glides to the next card", () => {
        reduced(false);
        expect(pageBehavior()).toBe("smooth");
    });

    it("jumps for someone who asked for less motion", () => {
        reduced(true);
        expect(pageBehavior()).toBe("auto");
    });
});
