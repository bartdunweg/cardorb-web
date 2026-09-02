import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedSearch } from "./use-debounced-search";

describe("useDebouncedSearch", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("waits for the typing to pause, then asks once", async () => {
        const search = vi.fn(async (term: string) => [term]);
        const { result, rerender } = renderHook(({ q }) => useDebouncedSearch(q, search, { delay: 100 }), { initialProps: { q: "p" } });
        rerender({ q: "pi" });
        rerender({ q: "pik" });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        expect(search).toHaveBeenCalledTimes(1);
        expect(search).toHaveBeenCalledWith("pik");
        expect(result.current.results).toEqual(["pik"]);
        expect(result.current.loading).toBe(false);
    });

    it("clears without asking below the minimum length", async () => {
        const search = vi.fn(async (term: string) => [term]);
        const { result } = renderHook(() => useDebouncedSearch(" a ", search, { minLength: 2, delay: 50 }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(50);
        });
        expect(search).not.toHaveBeenCalled();
        expect(result.current.results).toEqual([]);
    });

    it("ignores an answer that arrives after a newer question", async () => {
        const answers: Record<string, () => void> = {};
        const search = vi.fn((term: string) => new Promise<string[]>((resolve) => (answers[term] = () => resolve([term]))));
        const { result, rerender } = renderHook(({ q }) => useDebouncedSearch(q, search, { delay: 10 }), { initialProps: { q: "slow" } });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });
        rerender({ q: "fast" });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });
        await act(async () => {
            answers.fast();
        });
        await act(async () => {
            answers.slow();
        });
        expect(result.current.results).toEqual(["fast"]);
    });
});
