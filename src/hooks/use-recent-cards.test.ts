import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { PokemonCard } from "@/lib/api-shapes";
import { clearRecentCards, rememberCard, useRecentCards } from "./use-recent-cards";

const card = (id: string, name = id): PokemonCard => ({
    id,
    name,
    set: "Surging Sparks",
    number: "001",
    rarity: null,
    image: null,
    supertype: null,
    subtypes: null,
    hp: null,
    types: null,
    artist: null,
    series: null,
    releaseDate: null,
    setPrintedTotal: null,
    flavorText: null,
    nationalPokedexNumbers: null,
    owned: false,
    wishlist: false,
    quantity: 0,
    price: null,
});

describe("useRecentCards", () => {
    beforeEach(() => localStorage.clear());

    it("starts empty and remembers a card newest first", () => {
        const { result } = renderHook(() => useRecentCards());
        expect(result.current).toEqual([]);
        act(() => rememberCard(card("a", "Charizard")));
        act(() => rememberCard(card("b", "Pikachu")));
        expect(result.current.map((c) => c.name)).toEqual(["Pikachu", "Charizard"]);
    });

    it("moves a card opened again to the front rather than doubling it", () => {
        const { result } = renderHook(() => useRecentCards());
        act(() => rememberCard(card("a")));
        act(() => rememberCard(card("b")));
        act(() => rememberCard(card("a")));
        expect(result.current.map((c) => c.id)).toEqual(["a", "b"]);
    });

    it("keeps eight", () => {
        const { result } = renderHook(() => useRecentCards());
        for (const id of ["1", "2", "3", "4", "5", "6", "7", "8", "9"]) act(() => rememberCard(card(id)));
        expect(result.current.map((c) => c.id)).toEqual(["9", "8", "7", "6", "5", "4", "3", "2"]);
    });

    it("forgets all", () => {
        const { result } = renderHook(() => useRecentCards());
        act(() => rememberCard(card("a")));
        act(() => clearRecentCards());
        expect(result.current).toEqual([]);
        expect(localStorage.getItem("recent-cards")).toBeNull();
    });

    it("offers nothing from a value that is not ours, and leaves out a card missing a field", () => {
        localStorage.setItem("recent-cards", "{not json");
        const { result } = renderHook(() => useRecentCards());
        expect(result.current).toEqual([]);
        localStorage.setItem("recent-cards", JSON.stringify([{ id: "x", name: "Half a card" }, card("ok")]));
        const { result: again } = renderHook(() => useRecentCards());
        expect(again.current.map((c) => c.id)).toEqual(["ok"]);
    });
});
