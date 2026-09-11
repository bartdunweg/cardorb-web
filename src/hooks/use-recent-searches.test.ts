import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { clearSearches, forgetSearch, rememberSearch, useRecentSearches } from "./use-recent-searches";

describe("useRecentSearches", () => {
    beforeEach(() => localStorage.clear());

    it("starts empty and remembers a term newest first", () => {
        const { result } = renderHook(() => useRecentSearches());
        expect(result.current).toEqual([]);
        act(() => rememberSearch(" charizard "));
        act(() => rememberSearch("pikachu"));
        expect(result.current).toEqual(["pikachu", "charizard"]);
    });

    it("moves a term searched again to the front rather than doubling it, case aside", () => {
        const { result } = renderHook(() => useRecentSearches());
        act(() => rememberSearch("charizard"));
        act(() => rememberSearch("pikachu"));
        act(() => rememberSearch("Charizard"));
        expect(result.current).toEqual(["Charizard", "pikachu"]);
    });

    it("keeps five", () => {
        const { result } = renderHook(() => useRecentSearches());
        for (const t of ["a1", "b2", "c3", "d4", "e5", "f6"]) act(() => rememberSearch(t));
        expect(result.current).toEqual(["f6", "e5", "d4", "c3", "b2"]);
    });

    it("keeps nothing shorter than a search", () => {
        const { result } = renderHook(() => useRecentSearches());
        act(() => rememberSearch("c"));
        expect(result.current).toEqual([]);
    });

    it("forgets one, and all", () => {
        const { result } = renderHook(() => useRecentSearches());
        act(() => rememberSearch("charizard"));
        act(() => rememberSearch("pikachu"));
        act(() => forgetSearch("pikachu"));
        expect(result.current).toEqual(["charizard"]);
        act(() => clearSearches());
        expect(result.current).toEqual([]);
        expect(localStorage.getItem("recent-searches")).toBeNull();
    });

    it("offers nothing from a value that is not ours", () => {
        localStorage.setItem("recent-searches", "{not json");
        const { result } = renderHook(() => useRecentSearches());
        expect(result.current).toEqual([]);
    });
});
