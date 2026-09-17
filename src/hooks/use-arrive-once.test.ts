import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { resetArriveOnce, useArriveOnce } from "./use-arrive-once";

describe("useArriveOnce", () => {
    beforeEach(() => resetArriveOnce());

    it("arrives the first time a key is drawn, and not when it is drawn again", () => {
        const first = renderHook(() => useArriveOnce("account"));
        expect(first.result.current).toBe(true);
        first.unmount();
        // The other tree (rail or open list) drawing the same slot after a fold.
        const again = renderHook(() => useArriveOnce("account"));
        expect(again.result.current).toBe(false);
    });

    it("keeps its answer across rerenders of the same mount", () => {
        const { result, rerender } = renderHook(() => useArriveOnce("binders"));
        expect(result.current).toBe(true);
        rerender();
        expect(result.current).toBe(true);
    });

    it("counts each key on its own", () => {
        renderHook(() => useArriveOnce("binders")).unmount();
        expect(renderHook(() => useArriveOnce("account")).result.current).toBe(true);
        expect(renderHook(() => useArriveOnce("binders")).result.current).toBe(false);
    });
});
